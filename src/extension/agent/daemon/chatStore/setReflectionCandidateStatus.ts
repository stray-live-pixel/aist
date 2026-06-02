import type { AgentReflectionCandidate, AgentReflectionCandidateStatus } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: меняет статус предложения памяти в локальном чате.
 * Зачем нужно: save/reject действия должны сразу скрывать или обновлять карточку candidate.
 * Какую продуктовую проблему решает: пользователь не видит повторно уже обработанное предложение памяти.
 */
export function setReflectionCandidateStatus({
  state,
  chatId,
  candidateId,
  status
}: {
  state: DaemonChatStoreState;
  chatId: string;
  candidateId: string;
  status: AgentReflectionCandidateStatus;
}): AgentReflectionCandidate | undefined {
  const chat = requireChat({ state, chatId });
  const candidate = chat.reflectionCandidates?.find((item) => item.id === candidateId);
  if (!candidate) {
    return undefined;
  }

  candidate.status = status;
  touchChat({ state, chat });
  return candidate;
}
