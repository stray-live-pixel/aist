import type { AutonomousSessionView } from '../types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';

/**
 * Что это: ожидает активную сессию или читает завершённую из sessionStore.
 * Зачем нужно: CLI-команда может дождаться результата, а daemon — вернуть snapshot старой сессии.
 * Какую продуктовую проблему решает: пользователь получает итог автономной задачи независимо от её текущего состояния.
 */
export function waitForAutonomousSession({
  context,
  sessionId
}: {
  context: AutonomousBackendContext;
  sessionId: string;
}): Promise<AutonomousSessionView> {
  const completion = context.completions.get(sessionId);
  return completion || context.sessionStore.readSession(sessionId);
}
