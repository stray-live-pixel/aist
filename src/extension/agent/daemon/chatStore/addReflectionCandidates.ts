import type { AgentReflectionCandidate } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: добавляет предложения memory-субагента в локальный чат.
 * Зачем нужно: агент может предложить несколько candidate-записей после ответа.
 * Какую продуктовую проблему решает: пользователь видит все предложения памяти и управляет каждым отдельно.
 */
export function addReflectionCandidates({
  state,
  chatId,
  candidates
}: {
  state: DaemonChatStoreState;
  chatId: string;
  candidates: AgentReflectionCandidate[];
}): void {
  const chat = requireChat({ state, chatId });
  chat.reflectionCandidates = [...(chat.reflectionCandidates || []), ...candidates];
  touchChat({ state, chat });
}
