import type { useI18n } from '../../../../i18n';
import type { PerformanceTelemetryOperation } from '../../../../types';

/**
 * Что это: переводит технический код performance operation в пользовательскую подпись.
 * Зачем нужно: на странице телеметрии пользователь видит продуктовый сценарий, а не внутренний event id.
 * Какую продуктовую проблему решает: bottleneck понятен менеджеру, QA и разработчику без знания кода расширения.
 */
export function getPerformanceOperationLabel({
  operation,
  t
}: {
  operation: PerformanceTelemetryOperation;
  t: ReturnType<typeof useI18n>['t'];
}): string {
  if (operation === 'chat.create') return t('settings.telemetry.performance.operation.chatCreate');
  if (operation === 'agent.request') return t('settings.telemetry.performance.operation.agentRequest');
  if (operation === 'webview.render') return t('settings.telemetry.performance.operation.webviewRender');
  if (operation === 'webview.patch') return t('settings.telemetry.performance.operation.webviewPatch');
  return t('settings.telemetry.performance.operation.webviewState');
}
