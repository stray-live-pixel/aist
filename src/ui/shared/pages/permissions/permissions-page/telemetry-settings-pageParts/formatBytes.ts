import { formatNumber } from './formatNumber';

/**
 * Что это: форматирует объём контекста в B/KB/MB.
 * Зачем нужно: telemetry UI показывает размер prompt-контекста в привычных единицах.
 * Какую продуктовую проблему решает: можно быстро увидеть, когда контекст стал слишком тяжёлым для модели.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${formatNumber(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
