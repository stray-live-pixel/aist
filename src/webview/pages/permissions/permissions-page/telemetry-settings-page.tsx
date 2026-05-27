import { Copy, FileJson, FileText } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentRunTelemetryRecord, AgentTelemetryDashboard } from '../../../shared/types';
import { Badge, Button, Card } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';

export const TelemetrySettingsPage = memo(function TelemetrySettingsPage({
  telemetry
}: {
  telemetry: AgentTelemetryDashboard;
}) {
  const { t } = useI18n();
  const aggregate = telemetry.aggregates;
  const topTools = Object.entries(aggregate.toolCallsByType).slice(0, 8);

  return (
    <div className={styles.sectionStack}>
      <Card
        tone="elevated"
        title={t('settings.telemetry.title')}
        description={t('settings.telemetry.description')}
        actions={
          <div className={styles.actions}>
            <Button
              size="sm"
              leadingIcon={<FileJson size={14} />}
              onClick={() => agentActions.copyMessage(telemetry.jsonExport)}
            >
              {t('settings.telemetry.copyJson')}
            </Button>
            <Button
              size="sm"
              leadingIcon={<FileText size={14} />}
              onClick={() => agentActions.copyMessage(telemetry.markdownExport)}
            >
              {t('settings.telemetry.copyMarkdown')}
            </Button>
          </div>
        }
      >
        <div className={styles.metricsGrid}>
          <Metric label={t('settings.telemetry.runs')} value={formatNumber(aggregate.runCount)} />
          <Metric label={t('settings.telemetry.tokens')} value={formatNumber(aggregate.totalTokens)} />
          <Metric label={t('settings.telemetry.toolCalls')} value={formatNumber(aggregate.toolCallCount)} />
          <Metric label={t('settings.telemetry.failedEdits')} value={formatNumber(aggregate.failedEdits)} />
          <Metric label={t('settings.telemetry.repeatedCalls')} value={formatNumber(aggregate.repeatedToolCalls)} />
          <Metric label={t('settings.telemetry.contextBytes')} value={formatBytes(aggregate.contextBytes)} />
          <Metric label={t('settings.telemetry.avgDuration')} value={formatDuration(aggregate.averageDurationMs)} />
          <Metric
            label={t('settings.telemetry.avgFirstEdit')}
            value={
              aggregate.averageFirstEditLatencyMs === undefined
                ? t('common.notAvailable')
                : formatDuration(aggregate.averageFirstEditLatencyMs)
            }
          />
        </div>
        <div className={styles.telemetryStatusRow}>
          <Badge tone="success">{t('settings.telemetry.success', { count: aggregate.successCount })}</Badge>
          <Badge tone="danger">{t('settings.telemetry.error', { count: aggregate.errorCount })}</Badge>
          <Badge tone="warning">{t('settings.telemetry.stopped', { count: aggregate.stoppedCount })}</Badge>
          <Badge tone={aggregate.approvals.denied ? 'warning' : 'neutral'}>
            {t('settings.telemetry.approvals', {
              requested: aggregate.approvals.requested,
              approved: aggregate.approvals.approved,
              denied: aggregate.approvals.denied
            })}
          </Badge>
        </div>
        {telemetry.storagePath ? (
          <p className={styles.mutedBlock}>{t('settings.telemetry.storagePath', { path: telemetry.storagePath })}</p>
        ) : null}
      </Card>

      <Card title={t('settings.telemetry.toolsTitle')} description={t('settings.telemetry.toolsDescription')}>
        <div className={styles.telemetryToolList}>
          {topTools.length ? (
            topTools.map(([toolName, count]) => (
              <div key={toolName} className={styles.telemetryToolRow}>
                <span>{toolName}</span>
                <Badge tone="neutral">{formatNumber(count)}</Badge>
              </div>
            ))
          ) : (
            <p className={styles.empty}>{t('settings.telemetry.emptyTools')}</p>
          )}
        </div>
      </Card>

      <Card title={t('settings.telemetry.recentTitle')} description={t('settings.telemetry.recentDescription')}>
        <div className={styles.telemetryRunList}>
          {telemetry.recentRuns.length ? (
            telemetry.recentRuns.map((run) => <RunRow key={run.runId} run={run} />)
          ) : (
            <p className={styles.empty}>{t('settings.telemetry.emptyRuns')}</p>
          )}
        </div>
      </Card>
    </div>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricTile}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  );
}

function RunRow({ run }: { run: AgentRunTelemetryRecord }) {
  const { t } = useI18n();
  return (
    <div className={styles.telemetryRunRow}>
      <div className={styles.telemetryRunMain}>
        <span className={styles.telemetryRunTime}>{new Date(run.finishedAt).toLocaleString()}</span>
        <span className={styles.telemetryRunModel}>{run.model}</span>
      </div>
      <div className={styles.telemetryRunBadges}>
        <Badge tone={getStatusTone(run.status)}>{getStatusLabel(run.status, t)}</Badge>
        <Badge tone="neutral">{t('settings.telemetry.runTokens', { count: run.totalTokens })}</Badge>
        <Badge tone="neutral">{t('settings.telemetry.runTools', { count: run.toolCallCount })}</Badge>
        {run.firstEditLatencyMs !== undefined ? (
          <Badge tone="accent">
            {t('settings.telemetry.runFirstEdit', { value: formatDuration(run.firstEditLatencyMs) })}
          </Badge>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.telemetryCopyButton}
        title={t('settings.telemetry.copyRunJson')}
        onClick={() => agentActions.copyMessage(`${JSON.stringify(run, null, 2)}\n`)}
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

function getStatusTone(status: AgentRunTelemetryRecord['status']): 'success' | 'danger' | 'warning' {
  if (status === 'success') {
    return 'success';
  }

  return status === 'error' ? 'danger' : 'warning';
}

function getStatusLabel(status: AgentRunTelemetryRecord['status'], t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'success') {
    return t('settings.telemetry.status.success');
  }

  return status === 'error' ? t('settings.telemetry.status.error') : t('settings.telemetry.status.stopped');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(1)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${formatNumber(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
