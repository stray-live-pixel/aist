import * as vscode from 'vscode';
import { ChatStore } from '../chats/chatStore';
import type { Chat, ChatContextEstimate, ChatMessageUsageEstimate, ChatUsageEstimate } from '../chats/types';
import { CodexClient } from '../codex/client';
import { OpenRouterClient } from '../openrouter/client';
import type { OpenRouterMessage, OpenRouterModelOption, OpenRouterModelPricing, OpenRouterTool, ToolCall } from '../openrouter/types';
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
  addAgentMode,
  deleteAgentMode,
  getActiveAgentMode,
  getAgentLanguage,
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

type AgentLoopResult = {
  answer: string;
  history: OpenRouterMessage[];
  usage: ChatUsageEstimate;
};

type RepeatedToolCall = {
  signature: string;
  count: number;
  toolName: string;
  args: Record<string, unknown>;
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
  | { type: 'addAgentMode'; label: string; instructions: string }
  | { type: 'deleteAgentMode'; modeId: string }
  | { type: 'codexLogin' }
  | { type: 'codexLogout' }
  | { type: 'resolveToolCall'; messageId: string; approved: boolean }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string };

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
  private sidebarPage: 'chat' | 'settings' = 'chat';
  private readonly editorSurfaces = new Map<string, WebviewSurface>();
  private readonly openRouterClient = new OpenRouterClient();
  private readonly codexClient: CodexClient;
  private modelOptions: OpenRouterModelOption[] = [...FALLBACK_MODEL_OPTIONS];
  private modelsLoadedAt = 0;
  private modelLoadPromise: Promise<void> | undefined;
  private currentRun: AgentRun | undefined;
  private codexAuthenticated = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly chats: ChatStore,
    private readonly logger: AistLogger
  ) {
    this.codexClient = new CodexClient(context, logger);
    void this.refreshCodexAuthState();
    this.logger.info('AgentController initialized', {
      activeChatId: this.chats.getActiveChat().id,
      chatCount: this.chats.getSummaries().length
    });
  }

  openChat(chatId?: string): void {
    this.logger.info('openChat command received', { chatId: chatId || null });
    this.sidebarPage = 'chat';

    if (chatId) {
      this.sidebarChatId = chatId;
      this.chats.setActiveChat(chatId);
    }

    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
    this.postSidebarPage();
  }

  openSettings(): void {
    this.logger.info('openSettings command received');
    this.sidebarPage = 'settings';
    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.postSidebarPage();
  }

  async openStorage(): Promise<void> {
    const uri = this.context.storageUri || this.context.globalStorageUri;
    this.logger.info('openStorage command received', { path: uri.fsPath });

    await vscode.workspace.fs.createDirectory(uri);
    await vscode.env.openExternal(uri);
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
    this.postPage(surface, this.sidebarPage);
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
    this.sidebarPage = 'chat';

    this.logger.info('Chat created from command', {
      chatId: chat.id,
      title: chat.title,
      chatCount: this.chats.getSummaries().length,
      surfaces: this.getSurfaces().map((surface) => surface.id)
    });

    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
    this.postSidebarPage();
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

        const answer = await this.chat(
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
      this.postPage(surface, surface.kind === 'sidebar' ? this.sidebarPage : 'chat');
      void this.refreshModels();
      void this.refreshCodexAuthState();
    }

    if (message.type === 'ask') {
      await this.ask(surface.getChatId(), message.prompt);
    }

    if (message.type === 'newChat') {
      const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
      const chat = this.chats.createChat(configModel);
      surface.setChatId(chat.id);
      if (surface.kind === 'sidebar') {
        this.sidebarPage = 'chat';
      }
      this.logger.info('Chat created from webview', {
        surfaceId: surface.id,
        kind: surface.kind,
        chatId: chat.id,
        title: chat.title,
        chatCount: this.chats.getSummaries().length
      });
      this.sendState();
      if (surface.kind === 'sidebar') {
        this.postPage(surface, 'chat');
      }
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
      try {
        await setAgentModeInstructions(message.modeId, message.instructions);
      } catch (error) {
        this.logger.error('Failed to update agent mode instructions', error);
        vscode.window.showErrorMessage(`aist: failed to save agent mode instructions — ${getErrorMessage(error)}`);
      }
      this.sendState();
    }

    if (message.type === 'addAgentMode') {
      try {
        const mode = await addAgentMode(message.label, message.instructions);
        this.logger.info('Agent mode added', { id: mode.id, label: mode.label });
        await setAgentMode(mode.id);
      } catch (error) {
        this.logger.error('Failed to add agent mode', error);
        vscode.window.showErrorMessage(`aist: failed to add agent mode — ${getErrorMessage(error)}`);
      }
      this.sendState();
    }

    if (message.type === 'deleteAgentMode') {
      try {
        const deleted = await deleteAgentMode(message.modeId);
        this.logger.info('Agent mode delete attempted', { modeId: message.modeId, deleted });
      } catch (error) {
        this.logger.error('Failed to delete agent mode', error);
        vscode.window.showErrorMessage(`aist: failed to delete agent mode — ${getErrorMessage(error)}`);
      }
      this.sendState();
    }

    if (message.type === 'codexLogin') {
      try {
        await this.loginCodex();
      } catch (error) {
        this.logger.error('ChatGPT Codex login failed', error);
        vscode.window.showErrorMessage(`aist: ChatGPT Codex login failed — ${getErrorMessage(error)}`);
        await this.refreshCodexAuthState();
      }
    }

    if (message.type === 'codexLogout') {
      try {
        await this.logoutCodex();
      } catch (error) {
        this.logger.error('ChatGPT Codex logout failed', error);
        vscode.window.showErrorMessage(`aist: ChatGPT Codex logout failed — ${getErrorMessage(error)}`);
        await this.refreshCodexAuthState();
      }
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

    this.chats.appendMessage(chat.id, {
      role: 'user',
      content: cleanPrompt,
      usage: getMessageUsageEstimate(cleanPrompt)
    });
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
      const userHistoryMessage: OpenRouterMessage = { role: 'user', content: userContent };
      const initialHistory = [...chat.history.filter((message) => message.role !== 'system'), userHistoryMessage];
      this.chats.setHistory(chat.id, initialHistory);

      const result = await this.runAgentLoop(chat, initialHistory, run);
      this.chats.setHistory(chat.id, result.history);
      this.chats.setLastAnswer(chat.id, result.answer);
      this.chats.appendMessage(chat.id, {
        role: 'assistant',
        content: result.answer,
        usage: result.usage
      });
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

  private async runAgentLoop(chat: Chat, initialHistory: OpenRouterMessage[], run: AgentRun): Promise<AgentLoopResult> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const maxIterations = Math.max(0, Math.floor(config.get<number>('maxToolIterations') || 0));
    const workingMessages: OpenRouterMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...initialHistory.filter((message) => message.role !== 'system')
    ];
    const model = this.getModelOption(chat.model);
    const usage: ChatUsageEstimate = createEmptyUsage();
    const toolCallCounts = new Map<string, number>();

    for (let iteration = 0; maxIterations === 0 || iteration < maxIterations; iteration += 1) {
      this.throwIfStopped(run);
      this.chats.setActivity(chat.id, 'thinking');
      this.sendState();

      const promptTokens = estimateMessagesTokens(workingMessages);
      const responseMessage = await this.chat(workingMessages, filesystemTools, chat.model, run.abortController.signal);
      const completionTokens = estimateMessageTokens(responseMessage);
      const callUsage = getCallUsageEstimate(promptTokens, completionTokens, model?.pricing);
      mergeUsage(usage, callUsage);
      this.chats.addUsage(chat.id, callUsage);

      const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];

      if (!toolCalls.length) {
        const answer = responseMessage.content || '';
        workingMessages.push({
          role: 'assistant',
          content: answer,
          reasoning: responseMessage.reasoning
        });

        return {
          answer,
          history: getPersistableHistory(workingMessages),
          usage
        };
      }

      const repeatedToolCall = findRepeatedToolCall(toolCalls, toolCallCounts);
      if (repeatedToolCall) {
        const answer = getRepeatedToolCallAnswer(repeatedToolCall);
        this.logger.info('Stopping repeated tool-call loop', {
          chatId: chat.id,
          toolName: repeatedToolCall.toolName,
          count: repeatedToolCall.count,
          args: redactLargeArgs(repeatedToolCall.args)
        });
        workingMessages.push({ role: 'assistant', content: answer });

        return {
          answer,
          history: getPersistableHistory(workingMessages),
          usage
        };
      }

      workingMessages.push({
        role: 'assistant',
        content: responseMessage.content || '',
        reasoning: responseMessage.reasoning,
        tool_calls: toolCalls
      });

      for (const toolCall of toolCalls) {
        this.throwIfStopped(run);
        await this.handleToolCall(chat, workingMessages, toolCall, run);
      }

      this.chats.setHistory(chat.id, getPersistableHistory(workingMessages));
    }

    const answer = 'Stopped because the agent reached the tool iteration limit.';
    workingMessages.push({ role: 'assistant', content: answer });

    return {
      answer,
      history: getPersistableHistory(workingMessages),
      usage
    };
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
            result: preview ? { preview, result } : result,
            usage: getMessageUsageEstimate(result)
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
        result: preview ? { preview, result } : result,
        usage: getMessageUsageEstimate(result)
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
        result,
        usage: getMessageUsageEstimate(result)
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

  private postSidebarPage(): void {
    if (!this.sidebarView) {
      return;
    }

    this.postPage(
      {
        id: 'sidebar',
        kind: 'sidebar',
        webview: this.sidebarView.webview,
        getChatId: () => this.sidebarChatId || this.chats.getActiveChat().id,
        setChatId: (nextChatId) => {
          this.sidebarChatId = nextChatId;
          this.chats.setActiveChat(nextChatId);
        }
      },
      this.sidebarPage
    );
  }

  private postPage(surface: WebviewSurface, page: 'chat' | 'settings'): void {
    void surface.webview.postMessage({ type: 'page', page }).then(
      (delivered) => {
        this.logger.info('Page posted to webview', {
          surfaceId: surface.id,
          kind: surface.kind,
          page,
          delivered
        });
      },
      (error) => {
        this.logger.error('Failed to post page to webview', error);
      }
    );
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

  private getModelOption(modelId: string): OpenRouterModelOption | undefined {
    return this.modelOptions.find((model) => model.id === modelId);
  }

  async loginCodex(): Promise<void> {
    await this.codexClient.login();
    await this.refreshCodexAuthState();
    await this.refreshModels(true);
    this.sendState();
  }

  async logoutCodex(): Promise<void> {
    await this.codexClient.logout();
    await this.refreshCodexAuthState();
    this.sendState();
  }

  private async refreshCodexAuthState(): Promise<void> {
    try {
      this.codexAuthenticated = await this.codexClient.isAuthenticated();
      this.sendState();
    } catch (error) {
      this.codexAuthenticated = false;
      this.logger.error('Failed to read ChatGPT Codex auth state', error);
    }
  }

  private async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage> {
    if (isCodexModel(modelOverride)) {
      return this.codexClient.chat(messages, tools, modelOverride, signal);
    }

    return this.openRouterClient.chat(messages, tools, modelOverride, signal);
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
      const activeModel = models.find((model) => model.id === activeChat.model);
      const context = getChatContextEstimate(activeChat.history, this.getSystemPrompt(), activeModel);
      const { history: _history, ...webviewChat } = activeChat;
      const webviewActiveChat = {
        ...webviewChat,
        context,
        contextLength: context.tokens,
        usage: activeChat.usage || createEmptyUsage()
      };

      const stateMessage = {
        type: 'state',
        viewKind: surface.kind,
        workspaceName: getWorkspaceName(),
        tools: filesystemTools.map((tool) => tool.function.name),
        chats: this.chats.getSummaries(),
        activeChat: webviewActiveChat,
        models,
        maxToolIterations,
        reasoningEffort,
        agentLanguage: language,
        agentMode: activeMode.id,
        agentModes,
        codexAuthenticated: this.codexAuthenticated,
        toolPermissions: getToolPermissionItems()
      } as const;

      void surface.webview.postMessage(stateMessage).then(
        (delivered) => {
          this.logger.info('State posted to webview', {
            surfaceId: surface.id,
            kind: surface.kind,
            chatId: activeChat.id,
            chatCount: stateMessage.chats.length,
            messageCount: webviewActiveChat.messages.length,
            delivered
          });
        },
        (error) => {
          this.logger.error('Failed to post state to webview', error);
        }
      );
    }
  }

  private async refreshModels(force = false): Promise<void> {
    const now = Date.now();
    if (!force && (this.modelLoadPromise || now - this.modelsLoadedAt < 5 * 60 * 1000)) {
      return this.modelLoadPromise || Promise.resolve();
    }

    this.logger.info('Loading model list');

    this.modelLoadPromise = this.loadModels()
      .then((models) => {
        if (models.length) {
          this.modelOptions = models;
          this.modelsLoadedAt = Date.now();
          this.sendState();
          this.logger.info('Model list loaded', { count: models.length });
        } else {
          this.logger.info('Model list was empty');
        }
      })
      .catch((error) => {
        this.logger.error('Model list unavailable', error);
        vscode.window.setStatusBarMessage(`Model list unavailable: ${getErrorMessage(error)}`, 4000);
      })
      .finally(() => {
        this.modelLoadPromise = undefined;
      });

    return this.modelLoadPromise;
  }

  private async loadModels(): Promise<OpenRouterModelOption[]> {
    const [openRouterResult, codexResult] = await Promise.allSettled([
      this.openRouterClient.listModels(),
      Promise.resolve(this.codexClient.listModels())
    ]);
    const models: OpenRouterModelOption[] = [];

    if (openRouterResult.status === 'fulfilled') {
      models.push(...openRouterResult.value);
    } else {
      models.push(...FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === 'openrouter'));
      this.logger.error('OpenRouter model list unavailable', openRouterResult.reason);
    }

    if (codexResult.status === 'fulfilled') {
      models.push(...codexResult.value);
    } else {
      models.push(...FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === 'codex'));
      this.logger.error('Codex model list unavailable', codexResult.reason);
    }

    return mergeModels(models);
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

function isCodexModel(modelId: string | undefined): boolean {
  return Boolean(modelId?.startsWith('codex:'));
}

function isAbortError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

function getPersistableHistory(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  return messages.filter((message) => message.role !== 'system');
}

function findRepeatedToolCall(toolCalls: ToolCall[], counts: Map<string, number>): RepeatedToolCall | undefined {
  for (const toolCall of toolCalls) {
    const args = parseToolArguments(toolCall.function.arguments);
    const signature = getToolCallSignature(toolCall.function.name, args);
    const count = (counts.get(signature) || 0) + 1;
    counts.set(signature, count);

    if (count > 2) {
      return {
        signature,
        count,
        toolName: toolCall.function.name,
        args
      };
    }
  }

  return undefined;
}

function getToolCallSignature(toolName: string, args: Record<string, unknown>): string {
  const { reason: _reason, ...semanticArgs } = args;
  return `${toolName}:${stableStringify(semanticArgs)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function getRepeatedToolCallAnswer(toolCall: RepeatedToolCall): string {
  return [
    `Остановился, потому что модель повторила один и тот же вызов инструмента ${toolCall.toolName} ${toolCall.count} раза подряд в рамках одного запроса.`,
    'Результат такого вызова уже есть в контексте, поэтому дальнейшее повторение, скорее всего, было бы бесконечным циклом.',
    'Попробуйте уточнить задачу или попросить продолжить с учетом уже полученных результатов.'
  ].join('\n');
}

function getChatContextEstimate(
  history: OpenRouterMessage[],
  systemPrompt: string,
  model: OpenRouterModelOption | undefined
): ChatContextEstimate {
  const tokens = estimateMessagesTokens([{ role: 'system', content: systemPrompt }, ...history]);
  const maxTokens = model?.contextLength;
  const percent = maxTokens ? Math.min(100, Math.round((tokens / maxTokens) * 100)) : undefined;
  const inputCostUsd = getCostUsd(tokens, 0, model?.pricing);

  return {
    tokens,
    maxTokens,
    percent,
    inputCostUsd
  };
}

function getCallUsageEstimate(
  promptTokens: number,
  completionTokens: number,
  pricing: OpenRouterModelPricing | undefined
): ChatUsageEstimate {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: getCostUsd(promptTokens, completionTokens, pricing)
  };
}

function getMessageUsageEstimate(value: unknown): ChatMessageUsageEstimate {
  return {
    tokens: estimateValueTokens(value)
  };
}

function createEmptyUsage(): ChatUsageEstimate {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}

function mergeUsage(target: ChatUsageEstimate, usage: ChatUsageEstimate): void {
  target.promptTokens += usage.promptTokens;
  target.completionTokens += usage.completionTokens;
  target.totalTokens += usage.totalTokens;
  target.costUsd =
    target.costUsd === undefined && usage.costUsd === undefined ? undefined : (target.costUsd || 0) + (usage.costUsd || 0);
}

function estimateMessagesTokens(messages: OpenRouterMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
}

function estimateMessageTokens(message: OpenRouterMessage): number {
  return estimateValueTokens({
    role: message.role,
    content: message.content,
    reasoning: message.reasoning,
    tool_calls: message.tool_calls,
    tool_call_id: message.tool_call_id
  });
}

function estimateValueTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return Math.max(1, Math.ceil(text.length / 4));
}

function getCostUsd(
  promptTokens: number,
  completionTokens: number,
  pricing: OpenRouterModelPricing | undefined
): number | undefined {
  const promptCost = pricing?.prompt === undefined ? undefined : promptTokens * pricing.prompt;
  const completionCost = pricing?.completion === undefined ? undefined : completionTokens * pricing.completion;

  if (promptCost === undefined && completionCost === undefined) {
    return undefined;
  }

  return (promptCost || 0) + (completionCost || 0);
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
        provider: isCodexModel(modelId) ? 'codex' : 'openrouter',
        supportsTools: true
      });
    }
  }

  return [...byId.values()];
}
