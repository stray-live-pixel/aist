import { FileJson, FileText, Gauge } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import type { PerformanceTelemetryBucket, PerformanceTelemetryDashboard } from '../../../../types';
import { Badge, Button, Card } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { formatDuration } from './formatDuration';
import { formatNumber } from './formatNumber';
import { getPerformanceOperationLabel } from './getPerformanceOperationLabel';

/**
 * Что это: главная карточка системной performance telemetry.
 * Зачем нужно: показывает общую скорость ключевых сценариев и даёт export для review/issue.
 * Какую продуктовую проблему решает: регрессии extension можно обсуждать по готовым цифрам avg/p95/max без сырых логов.
 */
export function PerformanceSummaryCard({
  performanceTelemetry
}: {
  performanceTelemetry: PerformanceTelemetryDashboard;
}) {
  const { t } = useI18n();
  const totalCount = performanceTelemetry.summary.reduce((sum, bucket) => sum + bucket.count, 0);
  const totalRenders = performanceTelemetry.summary.reduce((sum, bucket) => sum + (bucket.totalRenderCount || 0), 0);
  const slowest = performanceTelemetry.blockers[0];
  const agentRequest = findBucketByOperation({ buckets: performanceTelemetry.summary, operation: 'agent.request' });
  const webviewRender = findBucketByOperation({ buckets: performanceTelemetry.summary, operation: 'webview.render' });

  return (
    <Card
      tone="accent"
      title={t('settings.telemetry.performance.title')}
      description={t('settings.telemetry.performance.description')}
      actions={
        <div className={styles.actions}>
          <Button
            size="sm"
            leadingIcon={<FileJson size={14} />}
            onClick={() => agentActions.copyMessage(performanceTelemetry.jsonExport)}
          >
            {t('settings.telemetry.performance.copyJson')}
          </Button>
          <Button
            size="sm"
            leadingIcon={<FileText size={14} />}
            onClick={() => agentActions.copyMessage(performanceTelemetry.markdownExport)}
          >
            {t('settings.telemetry.performance.copyMarkdown')}
          </Button>
        </div>
      }
    >
      <div className={styles.performanceIntroRow}>
        <Badge tone="accent" icon={<Gauge size={12} />}>
          {t('settings.telemetry.performance.systemBadge')}
        </Badge>
        {performanceTelemetry.storagePath ? (
          <span className={styles.mutedText}>
            {t('settings.telemetry.performance.storagePath', { path: performanceTelemetry.storagePath })}
          </span>
        ) : null}
      </div>

      <div className={styles.metricsGrid}>
        <Metric label={t('settings.telemetry.performance.records')} value={formatNumber(totalCount)} />
        <Metric
          label={t('settings.telemetry.performance.slowestAvg')}
          value={slowest ? formatDuration(slowest.averageDurationMs) : t('common.notAvailable')}
        />
        <Metric
          label={t('settings.telemetry.performance.agentRequestAvg')}
          value={agentRequest ? formatDuration(agentRequest.averageDurationMs) : t('common.notAvailable')}
        />
        <Metric
          label={t('settings.telemetry.performance.renderBatches')}
          value={webviewRender ? formatNumber(webviewRender.count) : '0'}
        />
        <Metric label={t('settings.telemetry.performance.renders')} value={formatNumber(totalRenders)} />
        <Metric
          label={t('settings.telemetry.performance.renderAvg')}
          value={webviewRender ? formatDuration(webviewRender.averageDurationMs) : t('common.notAvailable')}
        />
      </div>

      {performanceTelemetry.summary.length ? (
        <div className={styles.performanceOperationGrid}>
          {performanceTelemetry.summary.map((bucket) => (
            <div key={bucket.key} className={styles.performanceOperationTile}>
              <span className={styles.performanceOperationTitle}>
                {bucket.operation ? getPerformanceOperationLabel({ operation: bucket.operation, t }) : bucket.label}
              </span>
              <span className={styles.performanceOperationMeta}>
                {t('settings.telemetry.performance.bucketStats', {
                  count: bucket.count,
                  avg: formatDuration(bucket.averageDurationMs),
                  p95: formatDuration(bucket.p95DurationMs),
                  max: formatDuration(bucket.maxDurationMs)
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t('settings.telemetry.performance.empty')}</p>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricTile}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  );
}

function findBucketByOperation({
  buckets,
  operation
}: {
  buckets: PerformanceTelemetryBucket[];
  operation: PerformanceTelemetryBucket['operation'];
}): PerformanceTelemetryBucket | undefined {
  return buckets.find((bucket) => bucket.operation === operation);
}
