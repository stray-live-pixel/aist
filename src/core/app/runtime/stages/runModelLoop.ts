import type { AgentLoopResult, Chat, ChatUsageEstimate, OpenRouterMessage } from '../../../shared/types/types';
import type { AgentRuntimeConfigSnapshot } from '../agentRuntime';
import { getPersistableHistory } from './preparePrompt';

/**
 * Что это: планирует выполнение run после принятия запроса.
 * Зачем нужно: startAsk быстро возвращает accepted/runId, а тяжёлый loop стартует следующим tick.
 * Какую проблему решает: UI получает мгновенный ответ о старте run и не блокируется подготовкой модели.
 */
export function scheduleRunExecution({ task }: { task: () => Promise<void> }): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      void task().then(resolve, reject);
    }, 0);
  });
}

/**
 * Что это: накладывает настройки конкретного чата на runtime config.
 * Зачем нужно: каждый чат может иметь свои maxToolIterations, streamingEnabled и режим без инструментов.
 * Какую проблему решает: model loop использует один согласованный config snapshot без второго источника правды.
 */
export function withChatModelSettings({
  config,
  settings
}: {
  config: AgentRuntimeConfigSnapshot;
  settings: Chat['modelSettings'];
}): AgentRuntimeConfigSnapshot {
  return {
    ...config,
    maxToolIterations: Math.max(0, Math.floor(Number(settings.maxToolIterations) || 0)),
    streamingEnabled: settings.streamingEnabled === true,
    toolsDisabled: settings.toolsDisabled === true
  };
}

/**
 * Что это: завершает loop финальным assistant answer.
 * Зачем нужно: все ветки model loop одинаково добавляют ответ и возвращают persistable history.
 * Какую проблему решает: финализация ответа не расходится между обычным ответом и fallback после tool loop.
 */
export function finishWithAnswer({
  workingMessages,
  answer,
  reasoning,
  usage
}: {
  workingMessages: OpenRouterMessage[];
  answer: string;
  reasoning: OpenRouterMessage['reasoning'];
  usage: ChatUsageEstimate;
}): AgentLoopResult {
  workingMessages.push({ role: 'assistant', content: answer, reasoning });

  return {
    answer,
    history: getPersistableHistory({ messages: workingMessages }),
    usage
  };
}
