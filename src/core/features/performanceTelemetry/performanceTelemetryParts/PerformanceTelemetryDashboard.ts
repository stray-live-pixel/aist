import type { PerformanceTelemetryBucket } from './PerformanceTelemetryBucket';
import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';

/**
 * Что это: read-model страницы performance telemetry.
 * Зачем нужно: webview получает готовые графики по операциям, чатам, дням, неделям, месяцам и версиям.
 * Какую продуктовую проблему решает: пользователь и агент могут быстро найти bottleneck без разбора JSON вручную.
 */
export type PerformanceTelemetryDashboard = {
  storagePath?: string;
  recentRecords: PerformanceTelemetryRecord[];
  summary: PerformanceTelemetryBucket[];
  byChat: PerformanceTelemetryBucket[];
  byDay: PerformanceTelemetryBucket[];
  byWeek: PerformanceTelemetryBucket[];
  byMonth: PerformanceTelemetryBucket[];
  byVersion: PerformanceTelemetryBucket[];
  blockers: PerformanceTelemetryBucket[];
  jsonExport: string;
  markdownExport: string;
};
