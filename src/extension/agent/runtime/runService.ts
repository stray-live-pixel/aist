import type { ChatStore } from '../../chats/chatStore';
import type { Chat } from '../../chats/types';
import type { OpenRouterMessage, OpenRouterModelOption, OpenRouterTool, ToolCall } from '../../openrouter/types';
import { getErrorMessage } from '../../shared/errors';
import type { AistLogger } from '../../shared/logger';
import { getEditorContext } from '../context/editorContext';
import type { AgentRun } from '../types';
import { runAgentLoop } from './loop';
import { isAbortError } from './runtime';
import { handleAgentToolCall } from './toolRunner';
import { getMessageUsageEstimate } from './usage';

export type AgentRunServiceDeps = {
  chats: ChatStore;
  logger: AistLogger;
  sendState(): void;
  getSystemPrompt(): string;
  getModelOption(modelId: string): OpenRouterModelOption | undefined;
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage>;
};

/**
 * Управляет жизненным циклом одного активного запуска агента.
 *
 * Сервис хранит AbortController, permission resolvers и busy/activity статусы.
 * Это состояние связано с agent loop, а не с VS Code webview, поэтому оно
 * вынесено из AgentController и доступно через простые методы ask/stop/resolve.
 */
export class AgentRunService {
  private currentRun: AgentRun | undefined;

  constructor(private readonly deps: AgentRunServiceDeps) {}

  async ask(chatId: string, prompt: string): Promise<void> {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      return;
    }

    const chat = this.deps.chats.getChat(chatId) || this.deps.chats.getActiveChat();
    if (chat.busy) {
      this.deps.logger.info('Ignoring ask because chat is busy', { chatId: chat.id });
      return;
    }

    const run = this.startRun(chat, cleanPrompt);
    try {
      const initialHistory = this.createInitialHistory(chat, cleanPrompt);
      const result = await this.runLoop(chat, initialHistory, run);
      this.deps.chats.setHistory(chat.id, result.history);
      this.deps.chats.setLastAnswer(chat.id, result.answer);
      this.deps.chats.appendMessage(chat.id, { role: 'assistant', content: result.answer, usage: result.usage });
    } catch (error) {
      this.handleRunError(chat, run, error);
    } finally {
      this.finishRun(chat, run);
    }
  }

  stop(): void {
    const run = this.currentRun;
    if (!run) {
      return;
    }

    run.stopRequested = true;
    run.abortController.abort();
    this.deps.chats.setActivity(
      run.chatId,
      'stopping',
      'Stop requested. Aborting the model request and denying pending approvals.'
    );
    for (const resolver of run.permissionResolvers.values()) {
      resolver(false);
    }
    run.permissionResolvers.clear();
    this.deps.sendState();
  }

  resolveToolCall(messageId: string, approved: boolean): void {
    this.currentRun?.permissionResolvers.get(messageId)?.(approved);
  }

  private startRun(chat: Chat, prompt: string): AgentRun {
    this.deps.logger.info('Agent run started', { chatId: chat.id, promptLength: prompt.length });
    this.deps.chats.appendMessage(chat.id, { role: 'user', content: prompt, usage: getMessageUsageEstimate(prompt) });
    this.deps.chats.setBusy(chat.id, true);
    this.deps.chats.setActivity(chat.id, 'thinking', 'Preparing request context and sending the prompt to the model.');
    const run = {
      chatId: chat.id,
      abortController: new AbortController(),
      stopRequested: false,
      permissionResolvers: new Map()
    };
    this.currentRun = run;
    this.deps.sendState();
    return run;
  }

  private createInitialHistory(chat: Chat, prompt: string): OpenRouterMessage[] {
    const editorContext = getEditorContext();
    const userContent = [prompt, editorContext ? `\n\nActive editor context:\n${editorContext}` : ''].join('');
    const initialHistory = [
      ...chat.history.filter((message) => message.role !== 'system'),
      { role: 'user' as const, content: userContent }
    ];
    this.deps.chats.setHistory(chat.id, initialHistory);
    return initialHistory;
  }

  private runLoop(chat: Chat, initialHistory: OpenRouterMessage[], run: AgentRun) {
    return runAgentLoop(chat, initialHistory, run, {
      chats: this.deps.chats,
      logger: this.deps.logger,
      getSystemPrompt: this.deps.getSystemPrompt,
      getModelOption: this.deps.getModelOption,
      chat: this.deps.chat,
      handleToolCall: (targetChat, messages, toolCall, targetRun) =>
        this.handleToolCall(targetChat, messages, toolCall, targetRun),
      sendState: this.deps.sendState,
      throwIfStopped: (targetRun) => this.throwIfStopped(targetRun)
    });
  }

  private handleToolCall(
    chat: Chat,
    workingMessages: OpenRouterMessage[],
    toolCall: ToolCall,
    run: AgentRun
  ): Promise<void> {
    return handleAgentToolCall({
      chat,
      workingMessages,
      toolCall,
      run,
      chats: this.deps.chats,
      sendState: this.deps.sendState,
      throwIfStopped: (targetRun) => this.throwIfStopped(targetRun),
      askToolPermission: (messageId, targetRun) => this.askToolPermission(messageId, targetRun)
    });
  }

  private askToolPermission(messageId: string, run: AgentRun): Promise<boolean> {
    return new Promise((resolve) => {
      run.permissionResolvers.set(messageId, (approved) => {
        run.permissionResolvers.delete(messageId);
        resolve(approved);
      });
    });
  }

  private handleRunError(chat: Chat, run: AgentRun, error: unknown): void {
    if (run.stopRequested || isAbortError(error)) {
      this.deps.chats.appendMessage(chat.id, { role: 'status', content: 'Stopped.' });
      this.deps.logger.info('Agent run stopped', { chatId: chat.id });
      return;
    }
    this.deps.chats.appendMessage(chat.id, { role: 'error', content: getErrorMessage(error) });
    this.deps.logger.error('Agent run failed', error);
  }

  private finishRun(chat: Chat, run: AgentRun): void {
    if (this.currentRun === run) {
      this.currentRun = undefined;
    }
    this.deps.chats.setActivity(chat.id, undefined);
    this.deps.chats.setBusy(chat.id, false);
    this.deps.sendState();
    this.deps.logger.info('Agent run finished', { chatId: chat.id });
  }

  private throwIfStopped(run: AgentRun): void {
    if (run.stopRequested) {
      throw new Error('Stopped by user.');
    }
  }
}
