import type { DaemonClientNotificationParams } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: обрабатывает notification-запрос daemon к VS Code extension.
 * Зачем нужно: daemon не имеет прямого доступа к status bar и warning UI.
 * Какую продуктовую проблему решает: пользователь видит предупреждения и короткие статусы агента в VS Code.
 */
export async function handleBridgeNotification({
  context,
  params
}: {
  context: BridgeRuntimeContext;
  params: DaemonClientNotificationParams;
}): Promise<{ shown: boolean }> {
  if (params.level === 'warning') {
    context.notifier.showWarning(params.message);
  } else {
    context.notifier.setStatus(params.message, params.timeoutMs || 2400);
  }

  return { shown: true };
}
