import type {
  Chat,
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  ToolCall
} from '../../../core/types';
import type { ChatStore } from '../../chats/chatStore';
import { createChatErrorMessage } from '../../chats/errorMessages';
import { t } from '../../shared/i18n';
import type { AistLogger } from '../../shared/logger';
import { getRepoVerificationContextNote } from '../../shared/repoMap';
import { getWorkspaceFolder } from '../../shared/workspace';
import { governModelContext } from '../context/contextGovernor';
import { getEditorContextSnapshot } from '../context/editorContext';
import { getRelevantMemoryPromptBlock } from '../memory/memory';
import type { AgentRun, ToolApprovalDecision } from '../types';
import { MAX_MODEL_REQUEST_ATTEMPTS, formatChatErrorMessage, isRetryableModelRequestError } from './errors';
import { runAgentLoop } from './loop';
import {
  type RunReflectionOutcome,
  buildRunReflectionPrompt,
  buildRunReflectionTrace,
  parseReflectionResponse
} from './reflection';
import { isAbortError } from './runtime';
import { type RunTelemetryStatus, createRunTelemetryDraft, finalizeRunTelemetry } from './telemetry';
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
    let reflectionOutcome: RunReflectionOutcome = { status: 'stopped' };
    let telemetryStatus: RunTelemetryStatus = 'success';
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
      reflectionOutcome = { status: 'success', answer: result.answer };
    } catch (error) {
      this.handleRunError(chat, run, error);
      reflectionOutcome =
        run.stopRequested || isAbortError(error)
          ? { status: 'stopped' }
          : { status: 'error', error: formatChatErrorMessage(error, 'agent run failed') };
      telemetryStatus = reflectionOutcome.status === 'error' ? 'error' : 'stopped';
    } finally {
      this.finishRun(chat, run, telemetryStatus);
      this.schedulePostRunReflection(chat.id, run, reflectionOutcome);
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
    const startedAt = Date.now();
    const run = {
      chatId: chat.id,
      startedAt,
      prompt,
      abortController: new AbortController(),
      stopRequested: false,
      activityStream: this.createActivityStream(chat.id),
      permissionResolvers: new Map(),
      telemetry: createRunTelemetryDraft(chat, startedAt)
    };
    this.currentRun = run;
    this.deps.sendState();
    return run;
  }

  private createInitialHistory(chat: Chat, prompt: string): OpenRouterMessage[] {
    const initialHistory = governModelContext({
      prompt,
      history: chat.history,
      editorContext: getEditorContextSnapshot(),
      repoContextNote: getOptionalRepoContextNote(prompt),
      memoryContextBlock: getRelevantMemoryPromptBlock(prompt)
    }).messages;
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

  private finishRun(chat: Chat, run: AgentRun, telemetryStatus: RunTelemetryStatus): void {
    if (this.currentRun === run) {
      this.currentRun = undefined;
    }
    finalizeRunTelemetry(run.telemetry, telemetryStatus);
    this.deps.chats.setActivity(chat.id, undefined);
    this.deps.chats.setBusy(chat.id, false);
    this.deps.sendState();
    this.deps.logger.info('Agent run finished', { chatId: chat.id });
  }

  private schedulePostRunReflection(chatId: string, run: AgentRun, outcome: RunReflectionOutcome): void {
    if (run.stopRequested || outcome.status === 'stopped') {
      return;
    }

    setTimeout(() => {
      void this.runPostRunReflection(chatId, run, outcome);
    }, 0);
  }

  private async runPostRunReflection(chatId: string, run: AgentRun, outcome: RunReflectionOutcome): Promise<void> {
    const chat = this.deps.chats.getChat(chatId);
    if (!chat) {
      return;
    }

    const trace = buildRunReflectionTrace({
      chat,
      runStartedAt: run.startedAt,
      task: run.prompt,
      outcome
    });
    if (!trace.tools.length && !trace.errors.length && !trace.approvalFeedback.length && !trace.changedFiles.length) {
      return;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 30_000);
    try {
      const response = await this.deps.chat(
        [
          {
            role: 'system',
            content:
              'You are AIST post-run reflection. Produce only safe JSON candidates for user review. Never call tools.'
          },
          { role: 'user', content: buildRunReflectionPrompt(trace) }
        ],
        undefined,
        chat.model,
        abortController.signal
      );
      const candidates = parseReflectionResponse(response.content || '');
      if (candidates.length) {
        this.deps.chats.addReflectionCandidates(chatId, candidates);
        this.deps.sendState();
      }
    } catch (error) {
      this.deps.logger.info('Post-run reflection skipped', {
        chatId,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private throwIfStopped(run: AgentRun): void {
    if (run.stopRequested) {
      throw new Error('Stopped by user.');
    }
  }
}

function getOptionalRepoContextNote(prompt: string): string {
  try {
    return getRepoVerificationContextNote(getWorkspaceFolder().uri.fsPath, prompt);
  } catch {
    return '';
  }
}

function normalizeActivityPreview(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(-260).trimStart()}`;
}
