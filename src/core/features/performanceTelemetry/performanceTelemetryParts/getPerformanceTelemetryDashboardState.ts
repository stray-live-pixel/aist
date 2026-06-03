import type { PerformanceTelemetryDashboard } from './PerformanceTelemetryDashboard';
import { aggregatePerformanceByOperation, aggregatePerformanceTelemetry } from './aggregatePerformanceTelemetry';
import { exportPerformanceTelemetryJson } from './exportPerformanceTelemetryJson';
import { exportPerformanceTelemetryMarkdown } from './exportPerformanceTelemetryMarkdown';
import { getPerformancePeriodKey } from './getPerformancePeriodKey';
import { performanceTelemetryState } from './performanceTelemetryState';
import { sortPerformanceTelemetryRecords } from './sortPerformanceTelemetryRecords';

/**
 * Что это: строит read-model performance telemetry для страницы настроек.
 * Зачем нужно: UI получает готовые графики без знания storage и алгоритмов агрегации.
 * Какую продуктовую проблему решает: bottlenecks расширения видны в одном месте и одинаково считаются для всех пользователей.
 */
export function getPerformanceTelemetryDashboardState(): PerformanceTelemetryDashboard {
  const records = sortPerformanceTelemetryRecords(performanceTelemetryState.recordsCache);
  const dashboardBase: Omit<PerformanceTelemetryDashboard, 'jsonExport' | 'markdownExport'> = {
    storagePath: performanceTelemetryState.directory,
    recentRecords: records.slice(0, 30),
    summary: aggregatePerformanceByOperation(records),
    byChat: aggregatePerformanceTelemetry({
      records: records.filter((record) => record.chatId),
      getKey: (record) => `${record.chatId}:${record.operation}`,
      getLabel: (record) => `${record.chatId} · ${record.operation}`,
      limit: 20
    }),
    byDay: aggregateByPeriod({ records, period: 'day' }),
    byWeek: aggregateByPeriod({ records, period: 'week' }),
    byMonth: aggregateByPeriod({ records, period: 'month' }),
    byVersion: aggregatePerformanceTelemetry({
      records,
      getKey: (record) => `${record.extensionVersion}:${record.operation}`,
      getLabel: (record) => `${record.extensionVersion} · ${record.operation}`,
      limit: 20
    }),
    blockers: aggregatePerformanceTelemetry({
      records,
      getKey: (record) => `${record.operation}:${record.chatId || record.surfaceKind || 'global'}`,
      getLabel: (record) => `${record.operation} · ${record.chatId || record.surfaceKind || 'global'}`,
      limit: 8
    })
  };

  return {
    ...dashboardBase,
    jsonExport: exportPerformanceTelemetryJson(dashboardBase),
    markdownExport: exportPerformanceTelemetryMarkdown(dashboardBase)
  };
}

function aggregateByPeriod({
  records,
  period
}: {
  records: ReturnType<typeof sortPerformanceTelemetryRecords>;
  period: 'day' | 'week' | 'month';
}) {
  return aggregatePerformanceTelemetry({
    records,
    getKey: (record) => `${getPerformancePeriodKey({ timestamp: record.finishedAt, period })}:${record.operation}`,
    getLabel: (record) => `${getPerformancePeriodKey({ timestamp: record.finishedAt, period })} · ${record.operation}`,
    limit: 30
  }).sort((left, right) => left.key.localeCompare(right.key));
}
