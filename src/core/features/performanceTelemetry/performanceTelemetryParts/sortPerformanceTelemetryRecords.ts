import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';

/**
 * Что это: сортирует performance records от новых к старым.
 * Зачем нужно: recent list и pruning используют один порядок.
 * Какую продуктовую проблему решает: UI и storage одинаково понимают, какие замеры самые актуальные.
 */
export function sortPerformanceTelemetryRecords(records: PerformanceTelemetryRecord[]): PerformanceTelemetryRecord[] {
  return [...records].sort((left, right) => right.finishedAt - left.finishedAt || right.startedAt - left.startedAt);
}
