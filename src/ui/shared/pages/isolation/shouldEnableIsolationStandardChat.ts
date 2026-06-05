import { isIsolationSessionActive } from '../../shared/lib/isolation';
import type { IsolationSessionSummary } from '../../shared/types';

/**
 * Что это: правило доступности кнопки открытия стандартного чата isolated-сессии.
 * Зачем нужно: пользователь должен попасть в live-чат, как только агент уже выполняется или чат явно известен.
 * Какую продуктовую проблему решает: кнопка Open standard chat не остаётся серой во время работы Docker-агента.
 */
export function shouldEnableIsolationStandardChat({ session }: { session: IsolationSessionSummary }): boolean {
  return Boolean(session.chatId) || isIsolationSessionActive({ status: session.status });
}
