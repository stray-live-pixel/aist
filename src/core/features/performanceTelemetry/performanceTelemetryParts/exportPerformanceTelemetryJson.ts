import type { PerformanceTelemetryDashboard } from './PerformanceTelemetryDashboard';

/**
 * Что это: JSON export performance telemetry dashboard.
 * Зачем нужно: пользователь или агент может скопировать snapshot аналитики для review регрессии.
 * Какую продуктовую проблему решает: расследование скорости не требует доступа к внутренним объектам webview.
 */
export function exportPerformanceTelemetryJson(
  dashboard: Omit<PerformanceTelemetryDashboard, 'jsonExport' | 'markdownExport'>
): string {
  return `${JSON.stringify(dashboard, null, 2)}\n`;
}
