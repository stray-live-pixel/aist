import type { IsolationSessionSummary } from '../../../cli/daemonProtocol';

/**
 * Что это: вычисляет id стандартного чата isolated-сессии.
 * Зачем нужно: новые сессии получают chatId явно, а старые/частично обновлённые summary можно открыть по стабильному daemon id.
 * Какую продуктовую проблему решает: running-сессия остаётся наблюдаемой даже если поле chatId ещё не доехало в webview state.
 */
export function getIsolationStandardChatId({ session }: { session: IsolationSessionSummary }): string {
  return session.chatId || `isolation-${session.sessionId}`;
}
