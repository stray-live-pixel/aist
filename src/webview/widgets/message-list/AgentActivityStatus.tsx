/**
 * Что это: строка статуса активного запуска агента внутри истории чата.
 * Зачем нужно: статус относится к ответу агента, поэтому показывается в контенте,
 * а не в composer; анимированный логотип заменяет отдельный спиннер.
 * Пример использования: <AgentActivityStatus activity="thinking" />.
 */
import { useI18n } from '../../shared/i18n';
import type { Chat } from '../../shared/types';
import { AistAnimatedLogo } from '../../shared/ui/AistLogo';

type AgentActivityStatusProps = {
  activity: Chat['activity'];
};

export function AgentActivityStatus({ activity }: AgentActivityStatusProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3 rounded-[24px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-input-background)] px-3 py-2 text-[var(--vscode-foreground)]">
      <AistAnimatedLogo className="aist-logo-sm shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{formatActivity(activity, t)}</div>
        <div className="text-xs text-[var(--vscode-descriptionForeground)]">AIST AGENT</div>
      </div>
    </div>
  );
}

function formatActivity(activity: Chat['activity'], t: ReturnType<typeof useI18n>['t']): string {
  switch (activity) {
    case 'waitingForApproval':
      return t('activity.waitingForApproval');
    case 'runningTool':
      return t('activity.runningTool');
    case 'stopping':
      return t('activity.stopping');
    default:
      return t('activity.thinking');
  }
}
