import fs from 'node:fs';
import path from 'node:path';

import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';
import { normalizePerformanceTelemetryRecord } from './normalizePerformanceTelemetryRecord';
import { sortPerformanceTelemetryRecords } from './sortPerformanceTelemetryRecords';

/**
 * Что это: читает сохранённые performance telemetry records из глобального storage.
 * Зачем нужно: dashboard после перезапуска VS Code показывает историю скорости расширения.
 * Какую продуктовую проблему решает: регрессии можно анализировать задним числом, а не только в текущей сессии.
 */
export function readPerformanceTelemetryRecords(directory: string): PerformanceTelemetryRecord[] {
  try {
    if (!fs.existsSync(directory)) {
      return [];
    }

    const records = fs
      .readdirSync(directory)
      .filter((fileName) => fileName.endsWith('.json'))
      .flatMap((fileName) => readRecordFile({ filePath: path.join(directory, fileName) }));

    return sortPerformanceTelemetryRecords(records);
  } catch {
    return [];
  }
}

function readRecordFile({ filePath }: { filePath: string }): PerformanceTelemetryRecord[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    const record = normalizePerformanceTelemetryRecord(parsed);
    return record ? [record] : [];
  } catch {
    return [];
  }
}
