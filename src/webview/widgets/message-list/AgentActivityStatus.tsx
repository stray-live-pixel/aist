/**
 * Что это: строка статуса активного запуска агента внутри истории чата.
 * Зачем нужно: показывает не только общий статус, но и честную деталь текущей
 * операции, чтобы пользователь видел, что агент продолжает работу.
 * Пример использования: <AgentActivityStatus activity="thinking" detail="Calling OpenRouter..." />.
 */
import { useI18n } from '../../shared/i18n';
import type { Chat } from '../../shared/types';
import { AistAnimatedLogo } from '../../shared/ui/AistLogo';

type AgentActivityStatusProps = {
  activity: Chat['activity'];
  detail?: string;
};

export function AgentActivityStatus({ activity, detail }: AgentActivityStatusProps) {
  const { t } = useI18n();
  const secondaryText = detail || getDefaultDetail(activity, t);

  return (
    <div className="flex items-center gap-3 rounded-[24px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-input-background)] px-3 py-2 text-[var(--vscode-foreground)]">
      <AistAnimatedLogo className="aist-logo-sm shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{formatActivity(activity, t)}</div>
        <div
          className="activity-detail-marquee text-xs text-[var(--vscode-descriptionForeground)]"
          title={secondaryText}
        >
          <span>{secondaryText}</span>
        </div>
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
    case 'answering':
      return 'Model is answering';
    case 'stopping':
      return t('activity.stopping');
    default:
      return t('activity.thinking');
  }
}

function getDefaultDetail(activity: Chat['activity'], t: ReturnType<typeof useI18n>['t']): string {
  switch (activity) {
    case 'waitingForApproval':
      return 'A tool is ready, but AIST is waiting for your approval.';
    case 'runningTool':
      return 'A tool is currently running in the workspace.';
    case 'answering':
      return 'The model returned text and AIST is preparing the answer.';
    case 'stopping':
      return 'Abort requested. AIST is cancelling the current operation.';
    default:
      return t('activity.thinking');
  }
}
