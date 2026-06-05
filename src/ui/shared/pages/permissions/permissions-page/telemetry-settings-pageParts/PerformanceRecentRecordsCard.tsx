import { Copy } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import type { PerformanceTelemetryRecord } from '../../../../types';
import { Badge, Card } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { formatDuration } from './formatDuration';
import { getPerformanceOperationLabel } from './getPerformanceOperationLabel';

/**
 * Что это: список последних безопасных performance records.
 * Зачем нужно: после обнаружения bottleneck можно быстро открыть конкретный замер и скопировать JSON.
 * Какую продуктовую проблему решает: regression review получает факты по конкретным событиям без секретов и payload-ов.
 */
export function PerformanceRecentRecordsCard({ records }: { records: PerformanceTelemetryRecord[] }) {
  const { t } = useI18n();

  return (
    <Card
      title={t('settings.telemetry.performance.recentTitle')}
      description={t('settings.telemetry.performance.recentDescription')}
    >
      <div className={styles.telemetryRunList}>
        {records.length ? (
          records.map((record) => <PerformanceRecordRow key={record.id} record={record} />)
        ) : (
          <p className={styles.empty}>{t('settings.telemetry.performance.emptyRecent')}</p>
        )}
      </div>
    </Card>
  );
}

function PerformanceRecordRow({ record }: { record: PerformanceTelemetryRecord }) {
  const { t } = useI18n();
  const operationLabel = getPerformanceOperationLabel({ operation: record.operation, t });
  const detail = [record.reason, record.chatId, record.surfaceKind].filter(Boolean).join(' · ');

  return (
    <div className={styles.telemetryRunRow}>
      <div className={styles.telemetryRunMain}>
        <span className={styles.telemetryRunTime}>
          {operationLabel} · {formatDuration(record.durationMs)}
        </span>
        <span className={styles.telemetryRunModel}>{detail || new Date(record.finishedAt).toLocaleString()}</span>
      </div>
      <div className={styles.telemetryRunBadges}>
        <Badge tone={getStatusTone(record.status)}>{getStatusLabel(record.status, t)}</Badge>
        <Badge tone="neutral">{new Date(record.finishedAt).toLocaleString()}</Badge>
        {record.renderCount ? (
          <Badge tone="accent">{t('settings.telemetry.performance.rendersShort', { count: record.renderCount })}</Badge>
        ) : null}
        {typeof record.messageCount === 'number' ? (
          <Badge tone="neutral">
            {t('settings.telemetry.performance.messagesShort', { count: record.messageCount })}
          </Badge>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.telemetryCopyButton}
        title={t('settings.telemetry.performance.copyRecordJson')}
        onClick={() => agentActions.copyMessage(`${JSON.stringify(record, null, 2)}\n`)}
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

function getStatusTone(status: PerformanceTelemetryRecord['status']): 'success' | 'danger' | 'warning' {
  if (status === 'success') return 'success';
  if (status === 'error') return 'danger';
  return 'warning';
}

function getStatusLabel(status: PerformanceTelemetryRecord['status'], t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'success') return t('settings.telemetry.status.success');
  if (status === 'error') return t('settings.telemetry.status.error');
  return t('settings.telemetry.status.stopped');
}
