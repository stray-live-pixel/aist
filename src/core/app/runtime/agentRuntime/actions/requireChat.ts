import type { Chat } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';

/**
 * Что это: загружает чат и падает понятной ошибкой, если его нет.
 * Зачем нужно: все run-сценарии стартуют только из существующего chat entity.
 * Какую продуктовую проблему решает: некорректный chatId не создаёт частично записанный run.
 */
export async function requireChat({
  context,
  chatId
}: {
  context: AgentRuntimeContext;
  chatId: string;
}): Promise<Chat> {
  const chat = await context.deps.chatRepository.getChat(chatId);
  if (!chat) {
    throw new Error(`Chat not found: ${chatId}`);
  }
  return chat;
}
