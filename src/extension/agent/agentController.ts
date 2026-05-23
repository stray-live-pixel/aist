import * as vscode from 'vscode';
import { ChatStore } from '../chats/chatStore';
import type { Chat } from '../chats/types';
import { OpenRouterClient } from '../openrouter/client';
import type { OpenRouterMessage, OpenRouterModelOption, ToolCall } from '../openrouter/types';
import { DEFAULT_MODEL, FALLBACK_MODEL_OPTIONS } from '../shared/constants';
import { getErrorMessage } from '../shared/errors';
import type { AistLogger } from '../shared/logger';
import { getWebviewHtml } from '../shared/webviewHtml';
import { getWorkspaceName } from '../shared/workspace';
import { filesystemTools, previewFilesystemTool, runFilesystemTool } from '../tools/filesystemTools';
import { getToolPermission, getToolPermissionItems, setToolPermission, type ToolPermissionMode } from '../tools/permissions';
import { getEditorContext, replaceSelection, stripCodeFence } from './editorContext';
import { getSystemPrompt } from './prompts';
import {
  getActiveAgentMode,
  getAgentLanguage,
  getAgentMode,
  getAgentModes,
  setAgentLanguage,
  setAgentMode,
  setAgentModeInstructions,
  type AgentModeId
} from './settings';

type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';

type AgentRun = {
  chatId: string;
  abortController: AbortController;
  stopRequested: boolean;
  permissionResolvers: Map<string, (approved: boolean) => void>;
};

type WebviewMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string }
  | { type: 'newChat' }
  | { type: 'duplicateChat'; chatId: string }
  | { type: 'deleteChat'; chatId: string }
  | { type: 'setActiveChat'; chatId: string }
  | { type: 'openChatInEditor'; chatId?: string }
  | { type: 'setModel'; model: string }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
  | { type: 'setAgentLanguage'; language: 'ru' | 'en' }
  | { type: 'setAgentMode'; modeId: AgentModeId }
  | { type: 'setAgentModeInstructions'; modeId: AgentModeId; instructions: string }
  | { type: 'resolveToolCall'; messageId: string; approved: boolean }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string }
  | { type: 'insertLastAnswer' };

type WebviewSurface = {
  id: string;
  kind: 'sidebar' | 'editor';
  webview: vscode.Webview;
  getChatId(): string;
  setChatId(chatId: string): void;
};

export class AgentController {
  private sidebarView: vscode.WebviewView | undefined;
  private sidebarChatId: string | undefined;
  private readonly editorSurfaces = new Map<string, WebviewSurface>();
  private readonly client = new OpenRouterClient();
  private modelOptions: OpenRouterModelOption[] = [...FALLBACK_MODEL_OPTIONS];
  private modelsLoadedAt = 0;
  private modelLoadPromise: Promise<void> | undefined;
  private currentRun: AgentRun | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly chats: ChatStore,
    private readonly logger: AistLogger
  ) {
    this.logger.info('AgentController initialized', {
      activeChatId: this.chats.getActiveChat().id,
      chatCount: this.chats.getSummaries().length
    });
  }

  openChat(chatId?: string): void {
    this.logger.info('openChat command received', { chatId: chatId || null });

    if (chatId) {
      this.sidebarChatId = chatId;
      this.chats.setActiveChat(chatId);
    }

    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.logger.info('resolveWebviewView called', {
      viewType: webviewView.viewType,
      title: webviewView.title,
      visible: webviewView.visible
    });

    this.sidebarView = webviewView;
    this.sidebarChatId ||= this.chats.getActiveChat().id;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist')]
    };
    webviewView.webview.html = getWebviewHtml(webviewView.webview, this.context.extensionUri);
    webviewView.onDidDispose(() => {
      this.logger.info('Sidebar webview disposed');
      this.sidebarView = undefined;
    });

    const surface: WebviewSurface = {
      id: 'sidebar',
      kind: 'sidebar',
      webview: webviewView.webview,
      getChatId: () => this.sidebarChatId || this.chats.getActiveChat().id,
      setChatId: (nextChatId) => {
        this.sidebarChatId = nextChatId;
        this.chats.setActiveChat(nextChatId);
      }
    };

    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.logger.info('Sidebar webview message received', { type: message.type });
      void this.handleWebviewMessage(surface, message);
    });

    this.sendState(surface);
    void this.refreshModels();
  }

  openChatInEditor(chatId?: string): void {
    const activeChatId = chatId || this.sidebarChatId || this.chats.getActiveChat().id;
    const chat = this.chats.getChat(activeChatId) || this.chats.getActiveChat();
    const surfaceId = `${chat.id}:${Date.now()}`;
    let panelChatId = chat.id;

    this.logger.info('Opening chat in editor', { chatId: chat.id, surfaceId });

    const panel = vscode.window.createWebviewPanel(
      'openrouterAgentChat',
      `aist: ${chat.title}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist')]
      }
    );

    const surface: WebviewSurface = {
      id: surfaceId,
      kind: 'editor',
      webview: panel.webview,
      getChatId: () => panelChatId,
      setChatId: (nextChatId) => {
        panelChatId = nextChatId;
        const nextChat = this.chats.getChat(nextChatId);
        if (nextChat) {
          panel.title = `aist: ${nextChat.title}`;
        }
      }
    };

    this.editorSurfaces.set(surfaceId, surface);
    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri);
    panel.onDidDispose(() => {
      this.logger.info('Editor webview disposed', { surfaceId, chatId: panelChatId });
      this.editorSurfaces.delete(surfaceId);
    });
    panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.logger.info('Editor webview message received', { surfaceId, type: message.type });
      void this.handleWebviewMessage(surface, message);
    });

    this.sendState(surface);
    void this.refreshModels();
  }

  private getSurfaces(): WebviewSurface[] {
    const surfaces: WebviewSurface[] = [...this.editorSurfaces.values()];
    if (this.sidebarView) {
      surfaces.push({
        id: 'sidebar',
        kind: 'sidebar',
        webview: this.sidebarView.webview,
        getChatId: () => this.sidebarChatId || this.chats.getActiveChat().id,
        setChatId: (nextChatId) => {
          this.sidebarChatId = nextChatId;
          this.chats.setActiveChat(nextChatId);
        }
      });
    }

    return surfaces;
  }

  createChat(): void {
    this.logger.info('newChat command received');

    const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
    const chat = this.chats.createChat(configModel);
    this.sidebarChatId = chat.id;

    this.logger.info('Chat created from command', {
      chatId: chat.id,
      title: chat.title,
      chatCount: this.chats.getSummaries().length,
      surfaces: this.getSurfaces().map((surface) => surface.id)
    });

    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
    vscode.window.setStatusBarMessage('aist: New chat created', 1800);
  }

  async editSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Open a file first.');
      return;
    }

    const instruction = await vscode.window.showInputBox({
      title: 'aist: Edit Selection',
      prompt: 'Describe what should be generated or changed',
      placeHolder: 'Example: refactor this function and add error handling'
    });

    if (!instruction) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'aist is editing...',
        cancellable: false
      },
      async () => {
        const selectedText = editor.document.getText(editor.selection);
        const activeChat = this.chats.getActiveChat();
        const prompt = [
          'You are editing code in VS Code.',
          'Return only the final code that should replace the current selection.',
          'Do not include markdown fences, explanations, or commentary.',
          '',
          `File: ${editor.document.fileName}`,
          `Language: ${editor.document.languageId}`,
          '',
          `Instruction:\n${instruction}`,
          '',
          `Current selection:\n${selectedText || '(empty selection at cursor)'}`
        ].join('\n');

        const answer = await this.client.chat(
          [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          undefined,
          activeChat.model
        );

        await replaceSelection(editor, stripCodeFence(answer.content || ''));
        this.chats.setLastAnswer(activeChat.id, answer.content || '');
      }
    );
  }

  private async handleWebviewMessage(surface: WebviewSurface, message: WebviewMessage): Promise<void> {
    if (message.type === 'webviewReady') {
      this.logger.info('webviewReady received', {
        surfaceId: surface.id,
        kind: surface.kind,
        chatId: surface.getChatId()
      });
      this.sendState(surface);
      void this.refreshModels();
    }

    if (message.type === 'ask') {
      await this.ask(surface.getChatId(), message.prompt);
    }

    if (message.type === 'newChat') {
      const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
      const chat = this.chats.createChat(configModel);
      surface.setChatId(chat.id);
      this.logger.info('Chat created from webview', {
        surfaceId: surface.id,
        kind: surface.kind,
        chatId: chat.id,
        title: chat.title,
        chatCount: this.chats.getSummaries().length
      });
      this.sendState();
    }

    if (message.type === 'duplicateChat') {
      const source = this.chats.getChat(message.chatId);
      if (!source) {
        this.logger.info('Ignoring duplicateChat for missing chat', { chatId: message.chatId });
        this.sendState(surface);
        return;
      }

      const chat = this.chats.duplicateChat(message.chatId);
      surface.setChatId(chat.id);
      this.logger.info('Chat duplicated from webview', {
        surfaceId: surface.id,
        sourceChatId: message.chatId,
        chatId: chat.id,
        title: chat.title,
        chatCount: this.chats.getSummaries().length
      });
      this.sendState();
    }

    if (message.type === 'deleteChat') {
      const chat = this.chats.getChat(message.chatId);
      if (!chat) {
        this.logger.info('Ignoring deleteChat for missing chat', { chatId: message.chatId });
        this.sendState(surface);
        return;
      }

      if (chat.busy) {
        vscode.window.setStatusBarMessage('aist: Stop the chat before deleting it.', 2400);
        this.logger.info('Ignoring deleteChat for running chat', { chatId: message.chatId });
        this.sendState(surface);
        return;
      }

      const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
      const nextChat = this.chats.deleteChat(message.chatId, configModel);
      this.retargetDeletedChat(message.chatId, nextChat.id);
      this.logger.info('Chat deleted from webview', {
        surfaceId: surface.id,
        deletedChatId: message.chatId,
        activeChatId: nextChat.id,
        chatCount: this.chats.getSummaries().length
      });
      this.sendState();
    }

    if (message.type === 'setActiveChat') {
      if (!this.chats.getChat(message.chatId)) {
        this.logger.info('Ignoring setActiveChat for missing chat', { chatId: message.chatId });
        this.sendState(surface);
        return;
      }

      surface.setChatId(message.chatId);
      this.sendState(surface);
    }

    if (message.type === 'openChatInEditor') {
      this.openChatInEditor(message.chatId || surface.getChatId());
    }

    if (message.type === 'setModel') {
      const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
      this.chats.setModel(chat.id, message.model);
      await vscode.workspace.getConfiguration('openrouterAgent').update('model', message.model, vscode.ConfigurationTarget.Workspace);
      this.sendState();
    }

    if (message.type === 'setToolPermission') {
      await setToolPermission(message.toolName, message.permission);
      this.sendState();
    }

    if (message.type === 'setMaxToolIterations') {
      const value = Math.max(0, Math.floor(Number(message.maxToolIterations) || 0));
      await vscode.workspace
        .getConfiguration('openrouterAgent')
        .update('maxToolIterations', value, vscode.ConfigurationTarget.Workspace);
      this.sendState();
    }

    if (message.type === 'setReasoningEffort') {
      await vscode.workspace
        .getConfiguration('openrouterAgent')
        .update('reasoningEffort', normalizeReasoningEffort(message.reasoningEffort), vscode.ConfigurationTarget.Workspace);
      this.sendState();
    }

    if (message.type === 'setAgentLanguage') {
      await setAgentLanguage(message.language);
      this.sendState();
    }

    if (message.type === 'setAgentMode') {
      await setAgentMode(message.modeId);
      this.sendState();
    }

    if (message.type === 'setAgentModeInstructions') {
      await setAgentModeInstructions(message.modeId, message.instructions);
      this.sendState();
    }

    if (message.type === 'resolveToolCall') {
      this.resolveToolCall(message.messageId, message.approved);
    }

    if (message.type === 'stop') {
      this.stopCurrentRun();
    }

    if (message.type === 'clear') {
      const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
      this.chats.clearChat(chat.id);
      this.sendState(surface);
    }

    if (message.type === 'copyMessage') {
      await vscode.env.clipboard.writeText(message.markdown || '');
      vscode.window.setStatusBarMessage('Copied message markdown', 1800);
    }

    if (message.type === 'insertLastAnswer') {
      const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Open a file first.');
        return;
      }

      await replaceSelection(editor, stripCodeFence(chat.lastAnswer));
    }
  }

  private async ask(chatId: string, prompt: string): Promise<void> {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      return;
    }

    const chat = this.chats.getChat(chatId) || this.chats.getActiveChat();
    if (chat.busy) {
      this.logger.info('Ignoring ask because chat is busy', { chatId: chat.id });
      return;
    }

    this.logger.info('Agent run started', { chatId: chat.id, promptLength: cleanPrompt.length });

    this.chats.appendMessage(chat.id, { role: 'user', content: cleanPrompt });
    this.chats.setBusy(chat.id, true);
    this.chats.setActivity(chat.id, 'thinking');
    const run: AgentRun = {
      chatId: chat.id,
      abortController: new AbortController(),
      stopRequested: false,
      permissionResolvers: new Map()
    };
    this.currentRun = run;
    this.sendState();

    try {
      const editorContext = getEditorContext();
      const userContent = [cleanPrompt, editorContext ? `\n\nActive editor context:\n${editorContext}` : ''].join('');
      chat.history.push({ role: 'user', content: userContent });

      const answer = await this.runAgentLoop(chat, run);
      chat.history.push({ role: 'assistant', content: answer });
      this.chats.setLastAnswer(chat.id, answer);
      this.chats.appendMessage(chat.id, { role: 'assistant', content: answer });
    } catch (error) {
      if (run.stopRequested || isAbortError(error)) {
        this.chats.appendMessage(chat.id, { role: 'status', content: 'Stopped.' });
        this.logger.info('Agent run stopped', { chatId: chat.id });
      } else {
        this.chats.appendMessage(chat.id, { role: 'error', content: getErrorMessage(error) });
        this.logger.error('Agent run failed', error);
      }
    } finally {
      if (this.currentRun === run) {
        this.currentRun = undefined;
      }
      this.chats.setActivity(chat.id, undefined);
      this.chats.setBusy(chat.id, false);
      this.sendState();
      this.logger.info('Agent run finished', { chatId: chat.id });
    }
  }

  private async runAgentLoop(chat: Chat, run: AgentRun): Promise<string> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const maxIterations = Math.max(0, Math.floor(config.get<number>('maxToolIterations') || 0));
    const workingMessages: OpenRouterMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...chat.history.filter((message) => message.role !== 'system')
    ];

    for (let iteration = 0; maxIterations === 0 || iteration < maxIterations; iteration += 1) {
      this.throwIfStopped(run);
      this.chats.setActivity(chat.id, 'thinking');
      this.sendState();

      const responseMessage = await this.client.chat(workingMessages, filesystemTools, chat.model, run.abortController.signal);
      const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];

      if (!toolCalls.length) {
        return responseMessage.content || '';
      }

      workingMessages.push({
        role: 'assistant',
        content: responseMessage.content || '',
        tool_calls: toolCalls
      });

      for (const toolCall of toolCalls) {
        this.throwIfStopped(run);
        await this.handleToolCall(chat, workingMessages, toolCall, run);
      }
    }

    return 'Stopped because the agent reached the tool iteration limit.';
  }

  private async handleToolCall(chat: Chat, workingMessages: OpenRouterMessage[], toolCall: ToolCall, run: AgentRun): Promise<void> {
    const toolName = toolCall.function.name;
    const args = parseToolArguments(toolCall.function.arguments);
    const reason = getToolReason(args);

    const toolMessage = this.chats.appendMessage(chat.id, {
      role: 'tool',
      name: toolName,
      status: 'waiting',
      reason,
      args
    });
    this.sendState();

    try {
      this.throwIfStopped(run);
      const preview = await previewFilesystemTool(toolName, args);
      if (preview) {
        this.chats.updateMessage(chat.id, toolMessage.id, {
          result: { preview }
        });
        this.sendState();
      }

      const permission = getToolPermission(toolName);
      if (permission === 'ask') {
        this.chats.setActivity(chat.id, 'waitingForApproval');
        this.chats.updateMessage(chat.id, toolMessage.id, {
          status: 'waiting',
          approval: 'pending',
          result: preview ? { preview } : undefined
        });
        this.sendState();

        const allowed = await this.askToolPermission(toolMessage.id, run);
        if (!allowed) {
          const result = { ok: false, error: 'The user denied this tool call.' };
          this.chats.updateMessage(chat.id, toolMessage.id, {
            status: 'denied',
            approval: 'denied',
            reason,
            args,
            result: preview ? { preview, result } : result
          });
          workingMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
          this.sendState();
          return;
        }
      }

      this.throwIfStopped(run);
      this.chats.setActivity(chat.id, 'runningTool');
      this.chats.updateMessage(chat.id, toolMessage.id, {
        status: 'running',
        approval: permission === 'ask' ? 'approved' : undefined,
        reason,
        args,
        result: preview ? { preview } : undefined
      });
      this.sendState();

      const result = await runFilesystemTool(toolName, args);
      this.chats.updateMessage(chat.id, toolMessage.id, {
        status: result.ok === false ? 'error' : 'done',
        reason,
        args,
        result: preview ? { preview, result } : result
      });
      workingMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result, null, 2)
      });
    } catch (error) {
      const result = { ok: false, error: getErrorMessage(error) };
      this.chats.updateMessage(chat.id, toolMessage.id, {
        status: 'error',
        reason,
        args,
        result
      });
      workingMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }

    this.sendState();
  }

  private async askToolPermission(messageId: string, run: AgentRun): Promise<boolean> {
    return new Promise((resolve) => {
      run.permissionResolvers.set(messageId, (approved) => {
        run.permissionResolvers.delete(messageId);
        resolve(approved);
      });
    });
  }

  private resolveToolCall(messageId: string, approved: boolean): void {
    const resolver = this.currentRun?.permissionResolvers.get(messageId);
    if (resolver) {
      resolver(approved);
    }
  }

  private stopCurrentRun(): void {
    const run = this.currentRun;
    if (!run) {
      return;
    }

    run.stopRequested = true;
    run.abortController.abort();
    this.chats.setActivity(run.chatId, 'stopping');

    for (const resolver of run.permissionResolvers.values()) {
      resolver(false);
    }
    run.permissionResolvers.clear();

    this.sendState();
  }

  private retargetDeletedChat(deletedChatId: string, nextChatId: string): void {
    if (this.sidebarChatId === deletedChatId) {
      this.sidebarChatId = nextChatId;
    }

    for (const surface of this.editorSurfaces.values()) {
      if (surface.getChatId() === deletedChatId) {
        surface.setChatId(nextChatId);
      }
    }
  }

  private throwIfStopped(run: AgentRun): void {
    if (run.stopRequested) {
      throw new Error('Stopped by user.');
    }
  }

  private getSystemPrompt(): string {
    const mode = getActiveAgentMode();
    return getSystemPrompt({
      language: getAgentLanguage(),
      instructions: mode.instructions
    });
  }

  private sendState(targetSurface?: WebviewSurface): void {
    const surfaces = targetSurface ? [targetSurface] : this.getSurfaces();
    if (!surfaces.length) {
      this.logger.info('sendState skipped: no webview surfaces are registered');
      return;
    }

    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const configuredModel = config.get<string>('model') || DEFAULT_MODEL;
    const maxToolIterations = Math.max(0, Math.floor(config.get<number>('maxToolIterations') || 0));
    const reasoningEffort = normalizeReasoningEffort(config.get<string>('reasoningEffort'));
    const language = getAgentLanguage();
    const activeMode = getActiveAgentMode();
    const agentModes = getAgentModes();

    for (const surface of surfaces) {
      const activeChat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
      const models = mergeModels(this.modelOptions, configuredModel, activeChat.model);
      const { history: _history, ...webviewChat } = activeChat;

      const stateMessage = {
        type: 'state',
        viewKind: surface.kind,
        workspaceName: getWorkspaceName(),
        tools: filesystemTools.map((tool) => tool.function.name),
        chats: this.chats.getSummaries(),
        activeChat: webviewChat,
        models,
        maxToolIterations,
        reasoningEffort,
        agentLanguage: language,
        agentMode: activeMode.id,
        agentModes,
        toolPermissions: getToolPermissionItems()
      } as const;

      void surface.webview.postMessage(stateMessage).then(
        (delivered) => {
          this.logger.info('State posted to webview', {
            surfaceId: surface.id,
            kind: surface.kind,
            chatId: activeChat.id,
            chatCount: stateMessage.chats.length,
            messageCount: webviewChat.messages.length,
            delivered
          });
        },
        (error) => {
          this.logger.error('Failed to post state to webview', error);
        }
      );
    }
  }

  private async refreshModels(): Promise<void> {
    const now = Date.now();
    if (this.modelLoadPromise || now - this.modelsLoadedAt < 5 * 60 * 1000) {
      return this.modelLoadPromise || Promise.resolve();
    }

    this.logger.info('Loading OpenRouter model list');

    this.modelLoadPromise = this.client
      .listModels()
      .then((models) => {
        if (models.length) {
          this.modelOptions = models;
          this.modelsLoadedAt = Date.now();
          this.sendState();
          this.logger.info('OpenRouter model list loaded', { count: models.length });
        } else {
          this.logger.info('OpenRouter model list was empty');
        }
      })
      .catch((error) => {
        this.logger.error('OpenRouter model list unavailable', error);
        vscode.window.setStatusBarMessage(`OpenRouter model list unavailable: ${getErrorMessage(error)}`, 4000);
      })
      .finally(() => {
        this.modelLoadPromise = undefined;
      });

    return this.modelLoadPromise;
  }
}

function parseToolArguments(rawArgs: unknown): Record<string, unknown> {
  if (!rawArgs) {
    return {};
  }

  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
    return rawArgs as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(String(rawArgs));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getToolReason(args: Record<string, unknown>): string {
  const reason = args.reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : 'No reason provided by the model.';
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
}

function isAbortError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

function redactLargeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.length > 600) {
      result[key] = `${value.slice(0, 600)}... <truncated>`;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function mergeModels(models: OpenRouterModelOption[], ...selectedModels: string[]): OpenRouterModelOption[] {
  const byId = new Map<string, OpenRouterModelOption>();

  for (const model of models) {
    byId.set(model.id, model);
  }

  for (const modelId of selectedModels) {
    if (!byId.has(modelId)) {
      byId.set(modelId, {
        id: modelId,
        name: modelId,
        supportsTools: true
      });
    }
  }

  return [...byId.values()];
}
