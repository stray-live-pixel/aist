/**
 * Что это: строка статуса активного запуска агента внутри истории чата.
 * Зачем нужно: статус относится к ответу агента, поэтому показывается в контенте,
 * а не в composer; анимированный логотип заменяет отдельный спиннер.
 * Пример использования: <AgentActivityStatus activity="thinking" />.
 */
import type { Chat } from '../../shared/types';
import { AistAnimatedLogo } from '../../shared/ui/AistLogo';

type AgentActivityStatusProps = {
  activity: Chat['activity'];
};

export function AgentActivityStatus({ activity }: AgentActivityStatusProps) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-input-background)] px-3 py-2 text-[var(--vscode-foreground)]">
      <AistAnimatedLogo className="aist-logo-sm shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{formatActivity(activity)}</div>
        <div className="text-xs text-[var(--vscode-descriptionForeground)]">AIST AGENT</div>
      </div>
    </div>
  );
}

function formatActivity(activity: Chat['activity']): string {
  switch (activity) {
    case 'waitingForApproval':
      return 'Waiting for approval';
    case 'runningTool':
      return 'Running tool';
    case 'stopping':
      return 'Stopping';
    default:
      return 'Model is thinking';
  }
}
