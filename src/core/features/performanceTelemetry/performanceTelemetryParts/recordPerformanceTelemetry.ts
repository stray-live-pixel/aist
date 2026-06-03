import { randomUUID } from 'node:crypto';

import { MAX_PERFORMANCE_TELEMETRY_RECORDS } from './MAX_PERFORMANCE_TELEMETRY_RECORDS';
import { PERFORMANCE_TELEMETRY_SCHEMA_VERSION } from './PERFORMANCE_TELEMETRY_SCHEMA_VERSION';
import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';
import { performanceTelemetryState } from './performanceTelemetryState';
import { prunePerformanceTelemetryFiles } from './prunePerformanceTelemetryFiles';
import { sortPerformanceTelemetryRecords } from './sortPerformanceTelemetryRecords';
import { writePerformanceTelemetryRecord } from './writePerformanceTelemetryRecord';

/**
 * Что это: записывает один безопасный замер скорости расширения.
 * Зачем нужно: сценарии UI/daemon добавляют только бизнес-поля, а storage/cache обновляются централизованно.
 * Какую продуктовую проблему решает: все performance-графики строятся из одного источника правды.
 */
export function recordPerformanceTelemetry(
  input: Omit<PerformanceTelemetryRecord, 'schemaVersion' | 'id' | 'durationMs'> & { id?: string; durationMs?: number }
): PerformanceTelemetryRecord {
  const record: PerformanceTelemetryRecord = {
    ...input,
    schemaVersion: PERFORMANCE_TELEMETRY_SCHEMA_VERSION,
    id: input.id || randomUUID(),
    durationMs: Math.max(0, input.durationMs ?? input.finishedAt - input.startedAt)
  };

  performanceTelemetryState.recordsCache = sortPerformanceTelemetryRecords([
    record,
    ...performanceTelemetryState.recordsCache.filter((item) => item.id !== record.id)
  ]).slice(0, MAX_PERFORMANCE_TELEMETRY_RECORDS);

  writePerformanceTelemetryRecord(record);
  prunePerformanceTelemetryFiles();
  return record;
}
