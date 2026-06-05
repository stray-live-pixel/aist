import type { TranslationKey } from '../../../../i18n';
import { useI18n } from '../../../../i18n';
import type { PerformanceTelemetryBucket } from '../../../../types';
import { Badge, Card } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { formatDuration } from './formatDuration';
import { formatNumber } from './formatNumber';
import { getPerformanceOperationLabel } from './getPerformanceOperationLabel';

/**
 * Что это: компактный bar chart для группы performance buckets.
 * Зачем нужно: один компонент показывает разрезы по чатам, периодам, версиям и операциям без разных правил подсчёта.
 * Какую продуктовую проблему решает: самые медленные группы видны глазами, а не только в JSON export.
 */
export function PerformanceBucketChartCard({
  titleKey,
  descriptionKey,
  buckets,
  emptyKey
}: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  buckets: PerformanceTelemetryBucket[];
  emptyKey: TranslationKey;
}) {
  const { t } = useI18n();
  const maxDuration = Math.max(...buckets.map((bucket) => bucket.averageDurationMs), 1);

  return (
    <Card title={t(titleKey)} description={t(descriptionKey)}>
      {buckets.length ? (
        <div className={styles.performanceChartList}>
          {buckets.map((bucket) => {
            const percent = Math.max(6, Math.round((bucket.averageDurationMs / maxDuration) * 100));
            const label = bucket.operation
              ? getPerformanceOperationLabel({ operation: bucket.operation, t })
              : bucket.label;

            return (
              <div key={bucket.key} className={styles.performanceChartRow}>
                <div className={styles.performanceChartHeader}>
                  <span className={styles.performanceChartLabel} title={bucket.label}>
                    {label}
                  </span>
                  <div className={styles.performanceChartBadges}>
                    <Badge tone="neutral">
                      {t('settings.telemetry.performance.countShort', { count: formatNumber(bucket.count) })}
                    </Badge>
                    {bucket.totalRenderCount ? (
                      <Badge tone="accent">
                        {t('settings.telemetry.performance.rendersShort', {
                          count: formatNumber(bucket.totalRenderCount)
                        })}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className={styles.performanceBarTrack} aria-hidden="true">
                  <div className={styles.performanceBarFill} style={{ width: `${percent}%` }} />
                </div>
                <div className={styles.performanceChartStats}>
                  <span>
                    {t('settings.telemetry.performance.avgShort', { value: formatDuration(bucket.averageDurationMs) })}
                  </span>
                  <span>
                    {t('settings.telemetry.performance.p95Short', { value: formatDuration(bucket.p95DurationMs) })}
                  </span>
                  <span>
                    {t('settings.telemetry.performance.maxShort', { value: formatDuration(bucket.maxDurationMs) })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>{t(emptyKey)}</p>
      )}
    </Card>
  );
}
