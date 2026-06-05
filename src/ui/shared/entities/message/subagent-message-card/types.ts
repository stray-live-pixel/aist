import type { AgentReflectionCandidate, ChatMessage, SubagentRun } from '../../../shared/types';

/**
 * Что это: props карточки persisted сообщения субагента в основном чате.
 * Зачем нужно: карточка показывает статус дочернего анализа, candidates конкретного run и открывает детали запуска.
 */
export type SubagentMessageCardProps = {
  chatId: string;
  message: ChatMessage;
  subagentRun?: SubagentRun;
  candidates: AgentReflectionCandidate[];
  onOpenSubagent(runId: string): void;
};
