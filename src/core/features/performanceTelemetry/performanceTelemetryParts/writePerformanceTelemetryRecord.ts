import fs from 'node:fs';
import path from 'node:path';

import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';
import { performanceTelemetryState } from './performanceTelemetryState';

/**
 * Что это: сохраняет одну performance telemetry запись в глобальный .aist-agent.
 * Зачем нужно: диагностика скорости переживает перезапуск VS Code и доступна агенту/пользователю позже.
 * Какую продуктовую проблему решает: performance-регрессии можно доказать конкретными замерами, а не ощущениями.
 */
export function writePerformanceTelemetryRecord(record: PerformanceTelemetryRecord): void {
  if (!performanceTelemetryState.directory) {
    return;
  }

  try {
    fs.mkdirSync(performanceTelemetryState.directory, { recursive: true });
    fs.writeFileSync(
      path.join(performanceTelemetryState.directory, `${record.startedAt}-${record.id}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      'utf8'
    );
  } catch {
    // Performance telemetry is diagnostic-only; user workflows must never fail because storage is unavailable.
  }
}
