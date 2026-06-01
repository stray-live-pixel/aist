import type { AutonomousSessionKind } from '../types';

/**
 * Что это: результат принятия автономного запуска.
 * Зачем нужно: клиент получает operationId и sessionId сразу после постановки задачи.
 * Какую продуктовую проблему решает: UI/CLI могут подписаться на конкретную сессию без ожидания окончания.
 */
export type AutonomousStartResult = {
  readonly operationId: string;
  readonly accepted: true;
  readonly sessionId: string;
  readonly kind: AutonomousSessionKind;
  readonly targetId: string;
};
