/**
 * Что это: результат запроса остановки автономной сессии.
 * Зачем нужно: клиент понимает, был ли найден живой AbortController.
 * Какую продуктовую проблему решает: пользователь получает честный статус кнопки Stop.
 */
export type AutonomousStopResult = {
  readonly operationId: string;
  readonly stopped: boolean;
  readonly sessionId: string;
};
