import type { AutonomousBackendContext } from './AutonomousBackendContext';
import type { AutonomousExportFormat } from './AutonomousExportFormat';
import type { AutonomousExportResult } from './AutonomousExportResult';

/**
 * Что это: экспортирует автономную сессию в markdown или JSON.
 * Зачем нужно: CLI/daemon должны отдавать готовый контент без знания формата sessionStore.
 * Какую продуктовую проблему решает: пользователь может сохранить отчёт автономного запуска для review/share.
 */
export async function exportAutonomousSession({
  context,
  sessionId,
  format = 'markdown'
}: {
  context: AutonomousBackendContext;
  sessionId: string;
  format?: AutonomousExportFormat;
}): Promise<AutonomousExportResult> {
  const content =
    format === 'json'
      ? `${JSON.stringify(await context.sessionStore.readSession(sessionId, Number.MAX_SAFE_INTEGER), null, 2)}\n`
      : await context.sessionStore.exportMarkdown(sessionId);

  return { operationId: context.idFactory(), sessionId, format, content };
}
