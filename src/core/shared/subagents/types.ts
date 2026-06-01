import type { ChatMessage, OpenRouterMessage, ReasoningEffort } from '../types/types';

/**
 * Что это: режим безопасности запуска субагента.
 * Зачем нужно: продуктово отделяет быстрые фоновые подсказки от действий, которые пользователь должен явно подтвердить.
 */
export type SubagentSafetyMode = 'auto' | 'requiresApproval';

/**
 * Что это: запрос к модели, который готовит конкретный субагент.
 * Зачем нужно: shared-runner не знает продуктовую логику помощника, но умеет одинаково отправлять его prompt в модель.
 */
export type SubagentModelRequest = {
  messages: OpenRouterMessage[];
  model: string;
  reasoningEffort?: ReasoningEffort;
};

/**
 * Что это: минимальный клиент модели для субагентов.
 * Зачем нужно: механизм можно использовать в runtime, CLI и будущих сценариях без привязки к конкретному провайдеру.
 */
export type SubagentModelClient = {
  chat(
    messages: OpenRouterMessage[],
    tools: undefined,
    model: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage>;
};

/**
 * Что это: задача одного субагента.
 * Зачем нужно: позволяет запускать память, аудит или другие помощники через один общий исполнитель.
 */
export type SubagentTask<TResult> = {
  id: string;
  label: string;
  safetyMode: SubagentSafetyMode;
  buildRequest(): SubagentModelRequest;
  parseResponse(response: OpenRouterMessage): TResult;
  fallback?(error: unknown): TResult;
};

/**
 * Что это: результат запуска одного субагента.
 * Зачем нужно: вызывающий код видит, был ли ответ получен от модели или взят безопасный fallback.
 */
export type SubagentRunResult<TResult> = {
  taskId: string;
  label: string;
  status: 'success' | 'fallback' | 'error';
  result?: TResult;
  error?: string;
};

/**
 * Что это: входные данные для анализа памяти после ответа агента.
 * Зачем нужно: субагент памяти получает компактный продуктовый срез беседы, а не неограниченный сырой чат.
 */
export type MemoryAnalysisChatView = {
  chatId: string;
  messages: ChatMessage[];
};
