import { governModelContext } from '../../../features/context/contextGovernor';
import type { Chat, OpenRouterMessage } from '../../../shared/types/types';
import type { AgentRuntimeContext } from './context';
import {
  appendMemorySearchStartedMessage,
  completeMemorySearchMessage,
  failMemorySearchMessage
} from './memorySearchMessages';
import { removeLastSyntheticUserPrompt } from './removeLastSyntheticUserPrompt';
import type { AgentRuntimeAskOptions } from './types';

/**
 * Что это: собирает начальную историю модели с учётом memory context и режима synthetic prompt.
 * Зачем нужно: перед model loop runtime должен записать governed history и показать поиск памяти пользователю.
 * Какую продуктовую проблему решает: модель получает релевантный контекст, а история чата остаётся консистентной.
 */
export async function createInitialHistory({
  context,
  chat,
  runId,
  prompt,
  options
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  runId: string;
  prompt: string;
  options: AgentRuntimeAskOptions;
}): Promise<OpenRouterMessage[]> {
  const memoryToolMessage = await appendMemorySearchStartedMessage({ context, runId, chatId: chat.id, prompt });
  let memoryContextBlock: string | undefined;
  try {
    memoryContextBlock = await context.deps.contextProviders?.getMemoryContextBlock?.({ prompt, chat });
    await completeMemorySearchMessage({
      context,
      runId,
      chatId: chat.id,
      messageId: memoryToolMessage?.id,
      memoryContextBlock
    });
  } catch (error) {
    await failMemorySearchMessage({ context, runId, chatId: chat.id, messageId: memoryToolMessage?.id, error });
    throw error;
  }

  const governedHistory = governModelContext({ prompt, history: chat.history, memoryContextBlock }).messages;
  const initialHistory = options.skipUserMessage
    ? removeLastSyntheticUserPrompt({ messages: governedHistory, prompt })
    : governedHistory;
  await context.deps.chatRepository.setHistory(chat.id, initialHistory);
  return governedHistory;
}
