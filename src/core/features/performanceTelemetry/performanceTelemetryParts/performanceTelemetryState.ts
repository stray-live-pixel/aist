import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';

/**
 * Что это: in-memory состояние performance telemetry.
 * Зачем нужно: dashboard строится быстро, а disk I/O происходит только при записи новой диагностической записи.
 * Какую продуктовую проблему решает: страница настроек не перечитывает FS при каждом открытии.
 */
export const performanceTelemetryState: {
  directory?: string;
  recordsCache: PerformanceTelemetryRecord[];
} = {
  directory: undefined,
  recordsCache: []
};
