/**
 * Что это: создаёт локальный идентификатор run, когда внешнее run-хранилище не подключено.
 * Зачем нужно: runtime всё равно должен возвращать стабильный runId для stop/approval/event flow.
 * Какую продуктовую проблему решает: CLI и тесты могут запускать агента без обязательной базы run-событий.
 */
export function createRuntimeId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
