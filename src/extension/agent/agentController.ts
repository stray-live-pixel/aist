import * as vscode from 'vscode';
import { ChatStore } from '../chats/chatStore';
import type { Chat } from '../chats/types';
import { OpenRouterClient } from '../openrouter/client';
import type { OpenRouterMessage, OpenRouterModelOption, ToolCall } from '../openrouter/types';
import { DEFAULT_MODEL, FALLBACK_MODEL_OPTIONS } from '../shared/constants';
import { getErrorMessage } from '../shared/errors';
import { getWebviewHtml } from '../shared/webviewHtml';
import { getWorkspaceName } from '../shared/workspace';
import { filesystemTools, previewFilesystemTool, runFilesystemTool } from '../tools/filesystemTools';
import { getToolPermission, getToolPermissionItems, setToolPermission, type ToolPermissionMode } from '../tools/permissions';
import { getEditorContext, replaceSelection, stripCodeFence } from './editorContext';
import { getSystemPrompt } from './prompts';

type WebviewMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string }
  | { type: 'newChat' }
  | { type: 'setModel'; model: string }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string }
  | { type: 'insertLastAnswer' };

export class AgentController {
  private panel: vscode.WebviewPanel | undefined;
  private readonly client = new OpenRouterClient();
  private modelOptions: OpenRouterModelOption[] = [...FALLBACK_MODEL_OPTIONS];
  private modelsLoadedAt = 0;
  private modelLoadPromise: Promise<void> | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly chats: ChatStore
  ) {}

  openChat(chatId?: string): void {
    if (chatId) {
      this.chats.setActiveChat(chatId);
    }

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.sendState();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'openrouterAgentChat',
      'OpenRouter AI Agent',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist')]
      }
    );

    this.panel.webview.html = getWebviewHtml(this.panel.webview, this.context.extensionUri);
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
      void this.handleWebviewMessage(message);
    });

    this.sendState();
    void this.refreshModels();
  }

  createChat(): void {
    const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
    this.chats.createChat(configModel);
    this.openChat();
  }

  async editSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Open a file first.');
      return;
    }

    const instruction = await vscode.window.showInputBox({
      title: 'OpenRouter Agent: Edit Selection',
      prompt: 'Describe what should be generated or changed',
      placeHolder: 'Example: refactor this function and add error handling'
    });

    if (!instruction) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'OpenRouter Agent is editing...',
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
            { role: 'system', content: getSystemPrompt() },
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

  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    if (message.type === 'webviewReady') {
      this.sendState();
      void this.refreshModels();
    }

    if (message.type === 'ask') {
      await this.ask(message.prompt);
    }

    if (message.type === 'newChat') {
      this.createChat();
    }

    if (message.type === 'setModel') {
      const chat = this.chats.getActiveChat();
      this.chats.setModel(chat.id, message.model);
      await vscode.workspace.getConfiguration('openrouterAgent').update('model', message.model, vscode.ConfigurationTarget.Workspace);
      this.sendState();
    }

    if (message.type === 'setToolPermission') {
      await setToolPermission(message.toolName, message.permission);
      this.sendState();
    }

    if (message.type === 'clear') {
      const chat = this.chats.getActiveChat();
      this.chats.clearChat(chat.id);
      this.sendState();
    }

    if (message.type === 'copyMessage') {
      await vscode.env.clipboard.writeText(message.markdown || '');
      vscode.window.setStatusBarMessage('Copied message markdown', 1800);
    }

    if (message.type === 'insertLastAnswer') {
      const chat = this.chats.getActiveChat();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Open a file first.');
        return;
      }

      await replaceSelection(editor, stripCodeFence(chat.lastAnswer));
    }
  }

  private async ask(prompt: string): Promise<void> {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      return;
    }

    const chat = this.chats.getActiveChat();
    if (chat.busy) {
      return;
    }

    this.chats.appendMessage(chat.id, { role: 'user', content: cleanPrompt });
    this.chats.setBusy(chat.id, true);
    this.sendState();

    try {
      const editorContext = getEditorContext();
      const userContent = [cleanPrompt, editorContext ? `\n\nActive editor context:\n${editorContext}` : ''].join('');
      chat.history.push({ role: 'user', content: userContent });

      const answer = await this.runAgentLoop(chat);
      chat.history.push({ role: 'assistant', content: answer });
      this.chats.setLastAnswer(chat.id, answer);
      this.chats.appendMessage(chat.id, { role: 'assistant', content: answer });
    } catch (error) {
      this.chats.appendMessage(chat.id, { role: 'error', content: getErrorMessage(error) });
    } finally {
      this.chats.setBusy(chat.id, false);
      this.sendState();
    }
  }

  private async runAgentLoop(chat: Chat): Promise<string> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const maxIterations = config.get<number>('maxToolIterations') || 6;
    const workingMessages: OpenRouterMessage[] = [
      { role: 'system', content: getSystemPrompt() },
      ...chat.history.filter((message) => message.role !== 'system')
    ];

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const responseMessage = await this.client.chat(workingMessages, filesystemTools, chat.model);
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
        await this.handleToolCall(chat, workingMessages, toolCall);
      }
    }

    return 'Stopped because the agent reached the tool iteration limit.';
  }

  private async handleToolCall(chat: Chat, workingMessages: OpenRouterMessage[], toolCall: ToolCall): Promise<void> {
    const toolName = toolCall.function.name;
    const args = parseToolArguments(toolCall.function.arguments);
    const reason = getToolReason(args);

    this.chats.appendMessage(chat.id, {
      role: 'tool',
      name: toolName,
      status: 'waiting',
      reason,
      args
    });
    this.sendState();

    try {
      const permission = getToolPermission(toolName);
      if (permission === 'ask') {
        const allowed = await this.askToolPermission(toolName, args, reason);
        if (!allowed) {
          const result = { ok: false, error: 'The user denied this tool call.' };
          this.chats.appendMessage(chat.id, {
            role: 'tool',
            name: toolName,
            status: 'denied',
            reason,
            args,
            result
          });
          workingMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
          return;
        }
      }

      const preview = await previewFilesystemTool(toolName, args);
      if (preview) {
        this.chats.appendMessage(chat.id, {
          role: 'tool',
          name: toolName,
          status: 'done',
          reason: `Diff preview: ${reason}`,
          args,
          result: preview
        });
        this.sendState();
      }

      this.chats.appendMessage(chat.id, {
        role: 'tool',
        name: toolName,
        status: 'running',
        reason,
        args
      });
      this.sendState();

      const result = await runFilesystemTool(toolName, args);
      this.chats.appendMessage(chat.id, {
        role: 'tool',
        name: toolName,
        status: result.ok === false ? 'error' : 'done',
        reason,
        args,
        result
      });
      workingMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result, null, 2)
      });
    } catch (error) {
      const result = { ok: false, error: getErrorMessage(error) };
      this.chats.appendMessage(chat.id, {
        role: 'tool',
        name: toolName,
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

  private async askToolPermission(toolName: string, args: Record<string, unknown>, reason: string): Promise<boolean> {
    const answer = await vscode.window.showWarningMessage(
      `Allow OpenRouter Agent to run ${toolName}?`,
      {
        modal: true,
        detail: [`Reason: ${reason}`, '', `Arguments: ${JSON.stringify(redactLargeArgs(args), null, 2)}`].join('\n')
      },
      'Allow once',
      'Deny'
    );

    return answer === 'Allow once';
  }

  private sendState(): void {
    if (!this.panel) {
      return;
    }

    const activeChat = this.chats.getActiveChat();
    const configuredModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
    const models = mergeModels(this.modelOptions, configuredModel, activeChat.model);
    const { history: _history, ...webviewChat } = activeChat;

    this.panel.webview.postMessage({
      type: 'state',
      workspaceName: getWorkspaceName(),
      tools: filesystemTools.map((tool) => tool.function.name),
      chats: this.chats.getSummaries(),
      activeChat: webviewChat,
      models,
      toolPermissions: getToolPermissionItems()
    });
  }

  private async refreshModels(): Promise<void> {
    const now = Date.now();
    if (this.modelLoadPromise || now - this.modelsLoadedAt < 5 * 60 * 1000) {
      return this.modelLoadPromise || Promise.resolve();
    }

    this.modelLoadPromise = this.client
      .listModels()
      .then((models) => {
        if (models.length) {
          this.modelOptions = models;
          this.modelsLoadedAt = Date.now();
          this.sendState();
        }
      })
      .catch((error) => {
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
