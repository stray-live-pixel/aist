import type { AgentRuntimeText } from './types';

/**
 * Что это: стандартные тексты progress/activity для запуска агента.
 * Зачем нужно: runtime показывает пользователю понятные этапы без обязательной настройки UI-слоя.
 * Какую продуктовую проблему решает: в CLI, тестах и VS Code статусы агента остаются единообразными.
 */
export const defaultRuntimeText: AgentRuntimeText = {
  prepareRequest: () => 'Preparing model request.',
  requestModel: () => 'Requesting model response.',
  requestModelAfterTools: (iteration) => `Requesting model response after tool results (${iteration}).`,
  retryModelRequest: (attempt, maxAttempts) =>
    `Retrying model request (${attempt}/${maxAttempts}) after a connection error.`,
  finalAnswer: () => 'Preparing final answer.',
  modelRequestedTools: (count) => `Model requested ${count} tool call${count === 1 ? '' : 's'}.`,
  stopRequested: () => 'Stop requested. Aborting the model request and denying pending approvals.',
  reasoning: (text) => `Reasoning: ${text}`,
  answerDraft: (text) => `Answer draft: ${text}`
};
