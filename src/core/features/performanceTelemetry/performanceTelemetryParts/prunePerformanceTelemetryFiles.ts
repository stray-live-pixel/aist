import fs from 'node:fs';
import path from 'node:path';

import { MAX_PERFORMANCE_TELEMETRY_RECORDS } from './MAX_PERFORMANCE_TELEMETRY_RECORDS';
import { performanceTelemetryState } from './performanceTelemetryState';

/**
 * Что это: удаляет старые performance telemetry файлы сверх лимита.
 * Зачем нужно: глобальная диагностика не должна бесконечно занимать диск.
 * Какую продуктовую проблему решает: включённая аналитика не ухудшает работу расширения через месяцы использования.
 */
export function prunePerformanceTelemetryFiles(): void {
  if (!performanceTelemetryState.directory) {
    return;
  }

  try {
    const keepIds = new Set(performanceTelemetryState.recordsCache.map((record) => record.id));
    for (const fileName of fs.readdirSync(performanceTelemetryState.directory)) {
      if (!fileName.endsWith('.json')) continue;
      const shouldKeep = [...keepIds].some((id) => fileName.endsWith(`${id}.json`));
      if (!shouldKeep) {
        fs.unlinkSync(path.join(performanceTelemetryState.directory, fileName));
      }
    }
  } catch {
    // Cleanup is best-effort: stale telemetry files must not affect product workflows.
  }
}

export { MAX_PERFORMANCE_TELEMETRY_RECORDS };
