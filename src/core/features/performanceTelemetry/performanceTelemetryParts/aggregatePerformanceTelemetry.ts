import type { PerformanceTelemetryBucket } from './PerformanceTelemetryBucket';
import type { PerformanceTelemetryOperation, PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';

/**
 * Что это: агрегирует performance records по ключу графика.
 * Зачем нужно: одна функция считает count/avg/p95/max для операций, чатов, дат и версий.
 * Какую продуктовую проблему решает: сравнение регрессий остаётся одинаковым во всех разрезах аналитики.
 */
export function aggregatePerformanceTelemetry({
  records,
  getKey,
  getLabel,
  limit
}: {
  records: PerformanceTelemetryRecord[];
  getKey(record: PerformanceTelemetryRecord): string;
  getLabel(record: PerformanceTelemetryRecord, key: string): string;
  limit?: number;
}): PerformanceTelemetryBucket[] {
  const groups = new Map<string, PerformanceTelemetryRecord[]>();

  for (const record of records) {
    const key = getKey(record);
    groups.set(key, [...(groups.get(key) || []), record]);
  }

  return [...groups.entries()]
    .map(([key, groupRecords]) => buildBucket({ key, label: getLabel(groupRecords[0], key), records: groupRecords }))
    .sort((left, right) => right.averageDurationMs - left.averageDurationMs || right.count - left.count)
    .slice(0, limit);
}

/**
 * Что это: агрегирует performance records по типу операции.
 * Зачем нужно: summary сразу показывает, что медленнее — создание чата, запрос агента или webview-render.
 * Какую продуктовую проблему решает: bottleneck виден без ручной фильтрации JSON.
 */
export function aggregatePerformanceByOperation(records: PerformanceTelemetryRecord[]): PerformanceTelemetryBucket[] {
  return aggregatePerformanceTelemetry({
    records,
    getKey: (record) => record.operation,
    getLabel: (_record, key) => key
  }).map((bucket) => ({ ...bucket, operation: bucket.key as PerformanceTelemetryOperation }));
}

function buildBucket({
  key,
  label,
  records
}: {
  key: string;
  label: string;
  records: PerformanceTelemetryRecord[];
}): PerformanceTelemetryBucket {
  const durations = records.map((record) => record.durationMs).sort((left, right) => left - right);
  const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);
  const renderRecords = records.filter((record) => typeof record.renderCount === 'number');
  const totalRenderCount = renderRecords.reduce((sum, record) => sum + (record.renderCount || 0), 0);

  return {
    key,
    label,
    operation: getSingleValue(records.map((record) => record.operation)),
    extensionVersion: getSingleValue(records.map((record) => record.extensionVersion)),
    chatId: getSingleValue(records.map((record) => record.chatId).filter(Boolean) as string[]),
    count: records.length,
    averageDurationMs: records.length ? Math.round(totalDurationMs / records.length) : 0,
    p95DurationMs: percentile({ sortedValues: durations, percentile: 0.95 }),
    maxDurationMs: durations[durations.length - 1] || 0,
    totalDurationMs,
    averageRenderCount: renderRecords.length ? Math.round(totalRenderCount / renderRecords.length) : undefined,
    totalRenderCount: renderRecords.length ? totalRenderCount : undefined
  };
}

function percentile({ sortedValues, percentile }: { sortedValues: number[]; percentile: number }): number {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * percentile) - 1);
  return sortedValues[index];
}

function getSingleValue<T extends string>(values: T[]): T | undefined {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : undefined;
}
