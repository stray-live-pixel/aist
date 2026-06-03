import type { PerformanceTelemetryOperation } from './PerformanceTelemetryRecord';

/**
 * Что это: агрегат скорости операций внутри одного среза графика.
 * Зачем нужно: UI показывает не сырые записи, а среднюю длительность, p95 и количество операций.
 * Какую продуктовую проблему решает: регрессию видно однозначно даже при множестве запусков агента.
 */
export type PerformanceTelemetryBucket = {
  key: string;
  label: string;
  operation?: PerformanceTelemetryOperation;
  extensionVersion?: string;
  chatId?: string;
  count: number;
  averageDurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
  averageRenderCount?: number;
  totalRenderCount?: number;
};
