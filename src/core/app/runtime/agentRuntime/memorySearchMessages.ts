import { MEMORY_TOOL_NAME } from '../../../features/context/contextGovernor';
import type { ChatMessage } from '../../../shared/types/types';
import { createMemoryToolResult } from '../stages/selectMemory';
import { appendMessage, emit } from './actions';
import type { AgentRuntimeContext } from './context';
import { getErrorMessage } from './getErrorMessage';

/**
 * Что это: добавляет видимый tool-call поиска памяти до обращения к memory-субагенту.
 * Зачем нужно: пользователь видит, что AIST сначала подбирает релевантные заметки, а не зависает перед основным ответом.
 * Какую продуктовую проблему решает: долгий поиск памяти становится прозрачным шагом run.
 */
export async function appendMemorySearchStartedMessage({
  context,
  runId,
  chatId,
  prompt
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  prompt: string;
}): Promise<ChatMessage | undefined> {
  if (!context.deps.contextProviders?.getMemoryContextBlock) {
    return undefined;
  }

  return appendMessage({
    context,
    runId,
    chatId,
    message: {
      role: 'tool',
      name: MEMORY_TOOL_NAME,
      status: 'running',
      reason: 'Нужно найти релевантные заметки памяти перед ответом на текущий запрос пользователя.',
      nextStep: 'После подбора памяти основной агент продолжит стандартный запрос к модели.',
      args: { query: prompt }
    }
  });
}

/**
 * Что это: завершает видимый tool-call поиска памяти.
 * Зачем нужно: в чате остаётся понятный результат — найдены заметки для контекста или подходящей памяти нет.
 * Какую продуктовую проблему решает: результат memory lookup проверяем пользователем и QA.
 */
export async function completeMemorySearchMessage({
  context,
  runId,
  chatId,
  messageId,
  memoryContextBlock
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  messageId: string | undefined;
  memoryContextBlock: string | undefined;
}): Promise<void> {
  if (!messageId) {
    return;
  }

  const memoryNotes = memoryContextBlock?.trim() || '';
  const result = createMemoryToolResult({ memoryNotes });
  await context.deps.chatRepository.updateMessage(chatId, messageId, {
    status: 'done',
    result,
    modelResult: result
  });
  await emit({
    context,
    runId,
    event: { type: 'chat.updated', chatId, reason: 'memory.search.completed', at: context.now() }
  });
}

/**
 * Что это: переводит видимый tool-call памяти в ошибку.
 * Зачем нужно: если memory-субагент упал, пользователь видит конкретный сломанный шаг, а не вечный loader.
 * Какую продуктовую проблему решает: memory failure диагностируется как отдельный этап, а не как молчаливый сбой.
 */
export async function failMemorySearchMessage({
  context,
  runId,
  chatId,
  messageId,
  error
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  messageId: string | undefined;
  error: unknown;
}): Promise<void> {
  if (!messageId) {
    return;
  }

  const result = { ok: false, error: getErrorMessage({ error }) };
  await context.deps.chatRepository.updateMessage(chatId, messageId, {
    status: 'error',
    result,
    modelResult: result
  });
  await emit({
    context,
    runId,
    event: { type: 'chat.updated', chatId, reason: 'memory.search.failed', at: context.now() }
  });
}
