import type { RunReflectionOutcome } from '../../features/reflection/reflection';
import type { AgentRun, Chat, OpenRouterMessage } from '../../shared/types/types';
import { acceptRun } from './agentRuntime/acceptRun';
import { appendMessage } from './agentRuntime/actions';
import type { AgentRuntimeContext } from './agentRuntime/context';
import { resolveToolCall, stopRun } from './agentRuntime/controlRun';
import { createInitialHistory } from './agentRuntime/createInitialHistory';
import { createRuntimeId } from './agentRuntime/createRuntimeId';
import { defaultRuntimeText } from './agentRuntime/defaultRuntimeText';
import { finishRun } from './agentRuntime/finishRun';
import { handleRunError } from './agentRuntime/handleRunError';
import { schedulePostRunReflection } from './agentRuntime/postRunReflection';
import { removeLastSyntheticUserPrompt } from './agentRuntime/removeLastSyntheticUserPrompt';
import { runLoopWithRetries } from './agentRuntime/runLoopWithRetries';
import { startRun } from './agentRuntime/startRun';
import {
  type ActiveRun,
  type AgentRuntimeAskOptions,
  type AgentRuntimeRunResult,
  type AgentRuntimeServiceDeps,
  type AgentRuntimeTelemetryStatus,
  MAX_MODEL_REQUEST_ATTEMPTS
} from './agentRuntime/types';
import { formatChatErrorMessage as formatChatErrorMessageStage, toRuntimeError } from './stages/finalizeRun';
import { getPersistableHistory as getPersistableHistoryStage } from './stages/preparePrompt';
import {
  isAbortError as isAbortErrorStage,
  isRetryableModelRequestError as isRetryableModelRequestErrorStage
} from './stages/stopRun';

export {
  MAX_MODEL_REQUEST_ATTEMPTS,
  type AgentRuntimeAskOptions,
  type AgentRuntimeChatRepository,
  type AgentRuntimeConfigSnapshot,
  type AgentRuntimeContextProviders,
  type AgentRuntimeEventSink,
  type AgentRuntimeLogger,
  type AgentRuntimeModelCatalog,
  type AgentRuntimePromptProvider,
  type AgentRuntimeRunRepository,
  type AgentRuntimeRunResult,
  type AgentRuntimeServiceDeps,
  type AgentRuntimeTelemetryHooks,
  type AgentRuntimeTelemetryStatus,
  type AgentRuntimeText,
  type AgentRuntimeToolCallHandler,
  type AgentRuntimeToolCallHandlerParams,
  type MaybePromise
} from './agentRuntime/types';

/**
 * Что это: основной сервис выполнения агентского run.
 * Зачем нужно: сервис держит in-process active state, а тяжёлые этапы делегирует в декомпозированные сценарии.
 * Какую продуктовую проблему решает: один agent loop одинаково работает в тестах, CLI и VS Code extension.
 */
export class AgentRuntimeService {
  private readonly context: AgentRuntimeContext;

  constructor(deps: AgentRuntimeServiceDeps) {
    this.context = {
      deps,
      activeRunsByChat: new Map<string, ActiveRun>(),
      activeRunsById: new Map<string, ActiveRun>(),
      now: deps.now || Date.now,
      idFactory: deps.idFactory || createRuntimeId,
      text: { ...defaultRuntimeText, ...deps.text }
    };
  }

  /**
   * Что это: запускает запрос пользователя и ждёт завершения run.
   * Зачем нужно: синхронные CLI/test сценарии получают результат только после полного model/tool loop.
   * Какую продуктовую проблему решает: вызывающий код может дождаться стабильного состояния чата.
   */
  async ask(chatId: string, prompt: string, options: AgentRuntimeAskOptions = {}): Promise<AgentRuntimeRunResult> {
    const acceptedRun = await this.acceptRun(chatId, prompt, options);
    if (!acceptedRun.accepted) {
      return acceptedRun;
    }

    await acceptedRun.done;
    return { accepted: true, runId: acceptedRun.runId };
  }

  /**
   * Что это: запускает запрос пользователя в фоне.
   * Зачем нужно: UI получает accepted/runId сразу, а run продолжает выполняться асинхронно.
   * Какую продуктовую проблему решает: webview не блокируется на долгой работе модели и tools.
   */
  async startAsk(chatId: string, prompt: string, options: AgentRuntimeAskOptions = {}): Promise<AgentRuntimeRunResult> {
    const acceptedRun = await this.acceptRun(chatId, prompt, options);
    if (!acceptedRun.accepted) {
      return acceptedRun;
    }

    void acceptedRun.done.catch((error) => {
      this.context.deps.logger.error?.('Agent background run failed outside runtime handler', error);
    });
    return { accepted: true, runId: acceptedRun.runId };
  }

  /**
   * Что это: останавливает активный run.
   * Зачем нужно: пользователь может прервать model request и pending approvals.
   * Какую продуктовую проблему решает: долгий или ошибочный run не держит чат занятым бесконечно.
   */
  stop(runId?: string): void {
    stopRun({ context: this.context, runId });
  }

  /**
   * Что это: передаёт approval-решение ожидающему tool-call.
   * Зачем нужно: tool runner продолжает execution только после ответа пользователя.
   * Какую продуктовую проблему решает: опасные действия остаются под контролем пользователя.
   */
  resolveToolCall(messageId: string, decision: Parameters<typeof resolveToolCall>[0]['decision']): void {
    resolveToolCall({ context: this.context, messageId, decision });
  }

  private async acceptRun(chatId: string, prompt: string, options: AgentRuntimeAskOptions) {
    return acceptRun({
      context: this.context,
      chatId,
      prompt,
      options,
      execute: async ({ chatId: acceptedChatId, runId, run, cleanPrompt }) => {
        const chat = await this.context.deps.chatRepository.getChat(acceptedChatId);
        if (!chat) {
          throw new Error(`Chat not found: ${acceptedChatId}`);
        }
        await this.executeAcceptedRun(chat, runId, run, cleanPrompt, options);
      }
    });
  }

  private async executeAcceptedRun(
    chat: Chat,
    runId: string,
    run: AgentRun<unknown>,
    cleanPrompt: string,
    options: AgentRuntimeAskOptions
  ): Promise<void> {
    let reflectionOutcome: RunReflectionOutcome = { status: 'stopped' };
    let telemetryStatus: AgentRuntimeTelemetryStatus = 'success';
    try {
      await startRun({ context: this.context, chat, runId, run, prompt: cleanPrompt, options });
      const initialHistory = await createInitialHistory({
        context: this.context,
        chat,
        runId,
        prompt: cleanPrompt,
        options
      });
      const result = await runLoopWithRetries({ context: this.context, chat, initialHistory, runId, run });
      const resultHistory = options.skipUserMessage
        ? removeLastSyntheticUserPrompt({ messages: result.history, prompt: cleanPrompt })
        : result.history;
      await this.context.deps.chatRepository.setHistory(chat.id, resultHistory);
      await this.context.deps.chatRepository.setLastAnswer(chat.id, result.answer);
      await appendMessage({
        context: this.context,
        runId,
        chatId: chat.id,
        message: {
          role: 'assistant',
          content: result.answer,
          usage: result.usage.totalTokens ? result.usage : undefined
        }
      });
      reflectionOutcome = { status: 'success', answer: result.answer };
      await finishRun({
        context: this.context,
        chat,
        runId,
        run,
        status: 'success',
        answer: result.answer,
        usage: result.usage
      });
    } catch (error) {
      const stopped = run.stopRequested || isAbortError(error);
      telemetryStatus = stopped ? 'stopped' : 'error';
      reflectionOutcome = stopped
        ? { status: 'stopped' }
        : { status: 'error', error: formatChatErrorMessage(error, 'agent run failed') };
      const runtimeError = stopped ? undefined : toRuntimeError({ error });
      await handleRunError({ context: this.context, chat, runId, run, error, stopped });
      await finishRun({ context: this.context, chat, runId, run, status: telemetryStatus, error: runtimeError });
    } finally {
      this.context.activeRunsByChat.delete(chat.id);
      this.context.activeRunsById.delete(runId);
      schedulePostRunReflection({ context: this.context, chatId: chat.id, runId, run, outcome: reflectionOutcome });
    }
  }
}

/**
 * Что это: возвращает persistable history без служебных model-only сообщений.
 * Зачем нужно: публичный API сохраняет прежний импорт после декомпозиции prepare stage.
 * Какую продуктовую проблему решает: внешние callers не зависят от внутренней структуры runtime.
 */
export function getPersistableHistory(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  return getPersistableHistoryStage({ messages });
}

/**
 * Что это: проверяет, является ли ошибка отменой запроса.
 * Зачем нужно: публичный API сохраняет старое поведение stop/finalize helpers.
 * Какую продуктовую проблему решает: callers одинаково отличают отмену от реального сбоя.
 */
export function isAbortError(error: unknown): boolean {
  return isAbortErrorStage({ error });
}

/**
 * Что это: форматирует ошибку агента для сообщения в чате.
 * Зачем нужно: публичный helper остаётся стабильным после переноса finalize stage.
 * Какую продуктовую проблему решает: UI показывает понятный текст ошибки без знания stage API.
 */
export function formatChatErrorMessage(error: unknown, context?: string): string {
  return formatChatErrorMessageStage({ error, context });
}

/**
 * Что это: проверяет, можно ли повторить сбой model request.
 * Зачем нужно: публичный helper сохраняет старую контрактную точку для тестов и callers.
 * Какую продуктовую проблему решает: retry-policy остаётся единым источником правды.
 */
export function isRetryableModelRequestError(error: unknown): boolean {
  return isRetryableModelRequestErrorStage({ error });
}
