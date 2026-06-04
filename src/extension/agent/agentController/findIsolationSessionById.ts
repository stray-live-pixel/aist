import type { IsolationSessionSummary } from '../../../cli/daemonProtocol';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: ищет isolated-сессию в последнем daemon state extension bridge.
 * Зачем нужно: controller принимает только sessionId из webview и сам проверяет актуальное состояние.
 * Какую продуктовую проблему решает: кнопка не открывает случайный чат при устаревшем или удалённом sessionId.
 */
export function findIsolationSessionById({
  state,
  sessionId
}: {
  state: AgentControllerState;
  sessionId: string;
}): IsolationSessionSummary | undefined {
  return state.daemonRuntime.listIsolationSessions().find((candidate) => candidate.sessionId === sessionId);
}
