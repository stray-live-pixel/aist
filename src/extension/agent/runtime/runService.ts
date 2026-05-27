import type { ChatStore } from '../../chats/chatStore';
import { createChatErrorMessage } from '../../chats/errorMessages';
import type { Chat } from '../../chats/types';
import type {
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  ToolCall
} from '../../openrouter/types';
import { t } from '../../shared/i18n';
import type { AistLogger } from '../../shared/logger';
import { getEditorContext } from '../context/editorContext';
import type { AgentRun, ToolApprovalDecision } from '../types';
import { MAX_MODEL_REQUEST_ATTEMPTS, formatChatErrorMessage, isRetryableModelRequestError } from './errors';
import { runAgentLoop } from './loop';
import { isAbortError } from './runtime';
import { handleAgentToolCall } from './toolRunner';

export type AgentRunServiceDeps = {
  chats: ChatStore;
  logger: AistLogger;
  sendState(): void;
  reportError(error: unknown, options?: { chatId?: string; context?: string; appendToChat?: boolean }): void;
  getSystemPrompt(): string;
  getModelOption(modelId: string): OpenRouterModelOption | undefined;
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks
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
      const result = await this.runLoopWithRetries(chat, initialHistory, run);
      this.deps.chats.setHistory(chat.id, result.history);
      this.deps.chats.setLastAnswer(chat.id, result.answer);
      this.deps.chats.appendMessage(chat.id, {
        role: 'assistant',
        content: result.answer,
        usage: result.usage.totalTokens ? result.usage : undefined
      });
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
    this.deps.chats.setActivity(run.chatId, 'stopping', t('activity.detail.stopRequested'));
    for (const resolver of run.permissionResolvers.values()) {
      resolver({ approved: false, continueAfterDeny: false });
    }
    run.permissionResolvers.clear();
    this.deps.sendState();
  }

  resolveToolCall(messageId: string, decision: ToolApprovalDecision): void {
    this.currentRun?.permissionResolvers.get(messageId)?.(decision);
  }

  private startRun(chat: Chat, prompt: string): AgentRun {
    this.deps.logger.info('Agent run started', { chatId: chat.id, promptLength: prompt.length });
    this.deps.chats.setModelRequest(chat.id, undefined);
    this.deps.chats.appendMessage(chat.id, { role: 'user', content: prompt });
    this.deps.chats.setBusy(chat.id, true);
    this.deps.chats.setActivity(chat.id, 'thinking', t('activity.detail.prepareRequest'));
    const run = {
      chatId: chat.id,
      abortController: new AbortController(),
      stopRequested: false,
      activityStream: this.createActivityStream(chat.id),
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

  private async runLoopWithRetries(chat: Chat, initialHistory: OpenRouterMessage[], run: AgentRun) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_MODEL_REQUEST_ATTEMPTS; attempt += 1) {
      this.throwIfStopped(run);
      try {
        if (attempt > 1) {
          this.deps.chats.setActivity(
            chat.id,
            'thinking',
            t('activity.detail.retryModelRequest', { attempt, max: MAX_MODEL_REQUEST_ATTEMPTS })
          );
          this.deps.sendState();
        }
        return await this.runLoop(chat, initialHistory, run, attempt);
      } catch (error) {
        lastError = error;
        if (run.stopRequested || isAbortError(error) || !isRetryableModelRequestError(error)) {
          throw error;
        }

        this.deps.chats.updateModelRequest(chat.id, {
          phase: 'retrying',
          retryable: true,
          updatedAt: Date.now()
        });
        this.deps.sendState();
        this.deps.logger.error('Retryable model request failed', error);
        this.deps.reportError(error, {
          chatId: chat.id,
          context: `model request attempt ${attempt}/${MAX_MODEL_REQUEST_ATTEMPTS}`
        });

        if (attempt >= MAX_MODEL_REQUEST_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  private runLoop(chat: Chat, initialHistory: OpenRouterMessage[], run: AgentRun, requestAttempt: number) {
    return runAgentLoop(chat, initialHistory, run, {
      chats: this.deps.chats,
      logger: this.deps.logger,
      getSystemPrompt: this.deps.getSystemPrompt,
      getModelOption: this.deps.getModelOption,
      chat: this.deps.chat,
      handleToolCall: (targetChat, messages, toolCall, targetRun) =>
        this.handleToolCall(targetChat, messages, toolCall, targetRun),
      sendState: this.deps.sendState,
      throwIfStopped: (targetRun) => this.throwIfStopped(targetRun),
      requestAttempt,
      maxRequestAttempts: MAX_MODEL_REQUEST_ATTEMPTS
    });
  }

  private createActivityStream(chatId: string): NonNullable<AgentRun['activityStream']> {
    let reasoning = '';
    let content = '';
    let lastUpdateAt = 0;

    const flush = (force = false) => {
      const now = Date.now();
      if (!force && now - lastUpdateAt < 120) {
        return;
      }

      lastUpdateAt = now;
      const reasoningPreview = normalizeActivityPreview(reasoning);
      const contentPreview = normalizeActivityPreview(content);
      if (reasoningPreview) {
        this.deps.chats.setActivityDetail(chatId, t('activity.detail.reasoning', { text: reasoningPreview }));
      } else if (contentPreview) {
        this.deps.chats.setActivity(chatId, 'answering', t('activity.detail.answerDraft', { text: contentPreview }));
      } else {
        return;
      }
      this.deps.sendState();
    };

    return {
      reset: () => {
        reasoning = '';
        content = '';
        lastUpdateAt = 0;
      },
      hasContent: () => Boolean(normalizeActivityPreview(reasoning) || normalizeActivityPreview(content)),
      onComplete: () => flush(true),
      onReasoningDelta: (delta) => {
        reasoning += delta;
        flush();
      },
      onContentDelta: (delta) => {
        content += delta;
        flush();
      }
    };
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

  private askToolPermission(messageId: string, run: AgentRun): Promise<ToolApprovalDecision> {
    return new Promise((resolve) => {
      run.permissionResolvers.set(messageId, (decision) => {
        run.permissionResolvers.delete(messageId);
        resolve(decision);
      });
    });
  }

  private handleRunError(chat: Chat, run: AgentRun, error: unknown): void {
    if (run.stopRequested || isAbortError(error)) {
      this.deps.chats.appendMessage(chat.id, { role: 'status', marker: 'stopped' });
      this.deps.logger.info('Agent run stopped', { chatId: chat.id });
      return;
    }
    this.deps.chats.appendMessage(chat.id, createChatErrorMessage(formatChatErrorMessage(error, 'agent run failed')));
    this.deps.reportError(error, { chatId: chat.id, context: 'agent run failed', appendToChat: false });
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

function normalizeActivityPreview(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(-260).trimStart()}`;
}
