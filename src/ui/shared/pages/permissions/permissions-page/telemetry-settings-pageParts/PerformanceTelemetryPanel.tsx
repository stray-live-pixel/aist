import type { PerformanceTelemetryDashboard } from '../../../../types';
import { PerformanceBucketChartCard } from './PerformanceBucketChartCard';
import { PerformanceRecentRecordsCard } from './PerformanceRecentRecordsCard';
import { PerformanceSummaryCard } from './PerformanceSummaryCard';

/**
 * Что это: оркестратор performance telemetry на странице настроек.
 * Зачем нужно: собирает системные метрики скорости extension/webview в одном компактном разделе.
 * Какую продуктовую проблему решает: лаги создания чата, agent request, patch/state доставки и render-а видны без чтения файлов вручную.
 */
export function PerformanceTelemetryPanel({
  performanceTelemetry
}: {
  performanceTelemetry: PerformanceTelemetryDashboard;
}) {
  return (
    <>
      <PerformanceSummaryCard performanceTelemetry={performanceTelemetry} />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.blockersTitle"
        descriptionKey="settings.telemetry.performance.blockersDescription"
        buckets={performanceTelemetry.blockers}
        emptyKey="settings.telemetry.performance.empty"
      />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.byOperationTitle"
        descriptionKey="settings.telemetry.performance.byOperationDescription"
        buckets={performanceTelemetry.summary}
        emptyKey="settings.telemetry.performance.empty"
      />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.byChatTitle"
        descriptionKey="settings.telemetry.performance.byChatDescription"
        buckets={performanceTelemetry.byChat}
        emptyKey="settings.telemetry.performance.emptyChat"
      />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.byDayTitle"
        descriptionKey="settings.telemetry.performance.byDayDescription"
        buckets={performanceTelemetry.byDay}
        emptyKey="settings.telemetry.performance.emptyPeriod"
      />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.byWeekTitle"
        descriptionKey="settings.telemetry.performance.byWeekDescription"
        buckets={performanceTelemetry.byWeek}
        emptyKey="settings.telemetry.performance.emptyPeriod"
      />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.byMonthTitle"
        descriptionKey="settings.telemetry.performance.byMonthDescription"
        buckets={performanceTelemetry.byMonth}
        emptyKey="settings.telemetry.performance.emptyPeriod"
      />
      <PerformanceBucketChartCard
        titleKey="settings.telemetry.performance.byVersionTitle"
        descriptionKey="settings.telemetry.performance.byVersionDescription"
        buckets={performanceTelemetry.byVersion}
        emptyKey="settings.telemetry.performance.emptyVersion"
      />
      <PerformanceRecentRecordsCard records={performanceTelemetry.recentRecords} />
    </>
  );
}
