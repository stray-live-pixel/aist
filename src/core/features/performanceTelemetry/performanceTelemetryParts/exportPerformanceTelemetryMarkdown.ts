import type { PerformanceTelemetryBucket } from './PerformanceTelemetryBucket';
import type { PerformanceTelemetryDashboard } from './PerformanceTelemetryDashboard';

/**
 * Что это: Markdown export performance telemetry dashboard.
 * Зачем нужно: отчёт можно вставить в issue/review без ручного форматирования JSON.
 * Какую продуктовую проблему решает: регрессии скорости обсуждаются на понятном языке с цифрами avg/p95/max.
 */
export function exportPerformanceTelemetryMarkdown(
  dashboard: Omit<PerformanceTelemetryDashboard, 'jsonExport' | 'markdownExport'>
): string {
  return [
    '# AIST performance telemetry',
    '',
    `Storage: ${dashboard.storagePath || 'not initialized'}`,
    '',
    '## Slowest operation groups',
    formatBuckets(dashboard.blockers),
    '',
    '## By operation',
    formatBuckets(dashboard.summary),
    '',
    '## By version',
    formatBuckets(dashboard.byVersion)
  ].join('\n');
}

function formatBuckets(buckets: PerformanceTelemetryBucket[]): string {
  if (!buckets.length) return 'No records yet.';

  return buckets
    .map(
      (bucket) =>
        `- ${bucket.label}: count=${bucket.count}, avg=${bucket.averageDurationMs}ms, p95=${bucket.p95DurationMs}ms, max=${bucket.maxDurationMs}ms`
    )
    .join('\n');
}
