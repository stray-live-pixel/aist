import type { AutonomousExportFormat } from './AutonomousExportFormat';

/**
 * Что это: результат экспорта автономной сессии.
 * Зачем нужно: ответ содержит формат, sessionId и готовый текст отчёта.
 * Какую продуктовую проблему решает: клиенту не нужно знать детали sessionStore для скачивания отчёта.
 */
export type AutonomousExportResult = {
  readonly operationId: string;
  readonly sessionId: string;
  readonly format: AutonomousExportFormat;
  readonly content: string;
};
