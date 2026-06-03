import path from 'node:path';

import { performanceTelemetryDirectory } from './performanceTelemetryDirectory';
import { performanceTelemetryState } from './performanceTelemetryState';
import { readPerformanceTelemetryRecords } from './readPerformanceTelemetryRecords';

/**
 * Что это: инициализирует глобальное хранилище performance telemetry.
 * Зачем нужно: extension начинает писать скорость операций в домашний .aist-agent с самого старта.
 * Какую продуктовую проблему решает: метрики являются общими для компьютера, а не для одного проекта.
 */
export function initializePerformanceTelemetryStore(options: { homeDir?: string; fallbackRoot?: string } = {}): void {
  const directory = options.fallbackRoot
    ? path.join(options.fallbackRoot, 'performance-telemetry')
    : performanceTelemetryDirectory({ homeDir: options.homeDir });

  performanceTelemetryState.directory = directory;
  performanceTelemetryState.recordsCache = readPerformanceTelemetryRecords(directory);
}
