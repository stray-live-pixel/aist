import type { AgentState, IsolationSessionSummary } from '../../types';

/**
 * Что это: ищет isolated-сессию, чей live-run записывается в открытый стандартный чат.
 * Зачем нужно: стандартная ChatPage должна понимать, что пользователь сейчас смотрит Docker-агента.
 * Какую продуктовую проблему решает: follow-up из обычного чата продолжает isolated-сессию, а не запускает локальный workspace-run.
 */
export function findIsolationSessionByChatId({
  state,
  chatId
}: {
  state: Pick<AgentState, 'isolationSessions'>;
  chatId: string;
}): IsolationSessionSummary | undefined {
  return state.isolationSessions.find((session) => session.chatId === chatId);
}
