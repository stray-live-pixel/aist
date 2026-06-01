import type { AgentRun, Chat, ChatMessage } from '../../../shared/types/types';
import { formatChatErrorMessage } from '../stages/finalizeRun';
import { appendMessage } from './actions';
import type { AgentRuntimeContext } from './context';

/**
 * Что это: записывает пользовательское сообщение об остановке или ошибке run.
 * Зачем нужно: catch-блок execution должен одинаково закрывать stopped и failed сценарии.
 * Какую продуктовую проблему решает: в чате остаётся понятный итог вместо молчаливого падения агента.
 */
export async function handleRunError({
  context,
  chat,
  runId,
  run,
  error,
  stopped
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  runId: string;
  run: AgentRun<unknown>;
  error: unknown;
  stopped: boolean;
}): Promise<void> {
  if (stopped) {
    await appendMessage({ context, runId, chatId: chat.id, message: { role: 'status', marker: 'stopped' } });
    context.deps.logger.info('Agent run stopped', { chatId: chat.id, runId });
    return;
  }

  const content = formatChatErrorMessage({ error, context: 'agent run failed' });
  await appendMessage({ context, runId, chatId: chat.id, message: createErrorMessage({ context, content }) });
  context.deps.reportError?.(error, { chatId: chat.id, context: 'agent run failed', appendToChat: false });
  context.deps.logger.error?.('Agent run failed', error);
  run.stopRequested = false;
}

/**
 * Что это: создаёт chat message для ошибки через adapter или fallback.
 * Зачем нужно: UI-слой может задавать свой формат error message без изменения runtime.
 * Какую продуктовую проблему решает: ошибки отображаются консистентно в окружении продукта.
 */
export function createErrorMessage({
  context,
  content
}: {
  context: AgentRuntimeContext;
  content: string;
}): Omit<ChatMessage, 'id' | 'createdAt'> {
  return context.deps.createErrorMessage ? context.deps.createErrorMessage(content) : { role: 'error', content };
}
