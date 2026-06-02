import type { AgentReflectionCandidate, AgentReflectionCandidateStatus } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { requireChat } from './requireChat';
import { updateChatState } from './updateChatState';

/**
 * Что это: persisted-обновление решения пользователя по предложению памяти.
 * Зачем нужно: карточка memory-субагента должна исчезать после save/reject и не возвращаться при refresh.
 * Какую продуктовую проблему решает: пользователь не видит повторно уже обработанные предложения памяти.
 */
export async function setReflectionCandidateStatus({
  context,
  chatId,
  candidateId,
  status
}: {
  context: ChatRepositoryContext;
  chatId: string;
  candidateId: string;
  status: AgentReflectionCandidateStatus;
}): Promise<AgentReflectionCandidate | undefined> {
  const chat = await requireChat({ context, chatId });
  const candidates = chat.reflectionCandidates || [];
  const candidate = candidates.find((item) => item.id === candidateId);
  if (!candidate) {
    return undefined;
  }

  const nextCandidate = { ...candidate, status };
  await updateChatState({
    context,
    chatId,
    patch: { reflectionCandidates: candidates.map((item) => (item.id === candidateId ? nextCandidate : item)) }
  });
  return nextCandidate;
}
