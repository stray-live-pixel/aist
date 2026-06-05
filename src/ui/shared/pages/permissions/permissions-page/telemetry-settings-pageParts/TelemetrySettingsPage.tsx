import { memo } from 'react';

import type { AgentTelemetryDashboard, PerformanceTelemetryDashboard } from '../../../../types';
import styles from '../../PermissionsPage.module.scss';
import { PerformanceTelemetryPanel } from './PerformanceTelemetryPanel';
import { RunTelemetryPanel } from './RunTelemetryPanel';

/**
 * Что это: раздел настроек с локальной телеметрией AIST.
 * Зачем нужно: на верхнем уровне видно два независимых источника данных — run/tool метрики и скорость extension/webview.
 * Какую продуктовую проблему решает: оптимизация prompt/tools не смешивается с диагностикой лагов UI и daemon bridge.
 */
export const TelemetrySettingsPage = memo(function TelemetrySettingsPage({
  telemetry,
  performanceTelemetry
}: {
  telemetry: AgentTelemetryDashboard;
  performanceTelemetry: PerformanceTelemetryDashboard;
}) {
  return (
    <div className={styles.sectionStack}>
      <RunTelemetryPanel telemetry={telemetry} />
      <PerformanceTelemetryPanel performanceTelemetry={performanceTelemetry} />
    </div>
  );
});
