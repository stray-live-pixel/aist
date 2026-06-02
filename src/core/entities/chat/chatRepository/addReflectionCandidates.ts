import type { AgentReflectionCandidate } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { requireChat } from './requireChat';
import { updateChatState } from './updateChatState';

/**
 * Что это: добавление memory reflection candidates в state чата.
 * Зачем нужно: агент может предложить несколько записей памяти после ответа.
 * Какую продуктовую проблему решает: пользователь видит все предложения памяти и может принять/отклонить каждое.
 */
export async function addReflectionCandidates({
  context,
  chatId,
  candidates
}: {
  context: ChatRepositoryContext;
  chatId: string;
  candidates: AgentReflectionCandidate[];
}): Promise<void> {
  if (!candidates.length) {
    return;
  }

  const chat = await requireChat({ context, chatId });
  await updateChatState({
    context,
    chatId,
    patch: { reflectionCandidates: [...(chat.reflectionCandidates || []), ...candidates] }
  });
}
