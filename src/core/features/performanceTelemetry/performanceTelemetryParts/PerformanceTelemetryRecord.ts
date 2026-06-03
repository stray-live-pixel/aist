/**
 * Что это: тип операции, влияющей на скорость AIST extension.
 * Зачем нужно: аналитика группирует создание чата, запуск агента и webview-render отдельно.
 * Какую продуктовую проблему решает: видно, где именно появился performance-блокер.
 */
export type PerformanceTelemetryOperation =
  | 'chat.create'
  | 'agent.request'
  | 'webview.render'
  | 'webview.patch'
  | 'webview.state';

/**
 * Что это: безопасная локальная запись о скорости одной операции расширения.
 * Зачем нужно: запись хранит только timings/counts и не сохраняет prompts, tool args, outputs или secrets.
 * Какую продуктовую проблему решает: регрессии можно сравнивать по чатам, версиям и периодам без утечки данных.
 */
export type PerformanceTelemetryRecord = {
  schemaVersion: number;
  id: string;
  operation: PerformanceTelemetryOperation;
  extensionVersion: string;
  workspaceRoot?: string;
  chatId?: string;
  surfaceId?: string;
  surfaceKind?: 'sidebar' | 'editor';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: 'success' | 'error' | 'stopped';
  renderCount?: number;
  messageCount?: number;
  reason?: string;
  meta?: Record<string, string | number | boolean>;
};
