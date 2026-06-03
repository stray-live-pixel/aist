import path from 'node:path';

import { globalAistRoot } from '../../../entities/storage/storage';

/**
 * Что это: путь к глобальной performance telemetry на компьютере.
 * Зачем нужно: метрики скорости относятся к установленному расширению и машине, а не к одному workspace.
 * Какую продуктовую проблему решает: регрессии видны между проектами и версиями AIST.
 */
export function performanceTelemetryDirectory({ homeDir }: { homeDir?: string } = {}): string {
  return path.join(globalAistRoot(homeDir), 'performance-telemetry');
}
