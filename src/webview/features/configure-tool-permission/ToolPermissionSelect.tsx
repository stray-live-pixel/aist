import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type { ToolPermissionItem, ToolPermissionMode } from '../../shared/types';
import { ToolIcon } from '../../shared/ui/ToolIcon';

type ToolPermissionSelectProps = {
  item: ToolPermissionItem;
};

export function ToolPermissionSelect({ item }: ToolPermissionSelectProps) {
  const { t } = useI18n();

  return (
    <article className="message-card bg-[var(--vscode-input-background)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ToolIcon name={item.name} />
            <span>{t(`tool.label.${item.name}` as never)}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
            {t(`tool.description.${item.name}` as never)}
          </p>
          <p className="mt-1 text-xs text-[var(--vscode-descriptionForeground)]">
            {t('settings.permission.default', { permission: formatPermission(item.defaultPermission, t) })}
          </p>
        </div>
        <select
          className="w-48 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 py-1 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
          value={item.permission}
          onChange={(event) =>
            vscode.postMessage({
              type: 'setToolPermission',
              toolName: item.name,
              permission: event.target.value as ToolPermissionMode
            })
          }
        >
          <option value="ask">{t('settings.permission.ask')}</option>
          <option value="auto">{t('settings.permission.auto')}</option>
        </select>
      </div>
    </article>
  );
}

function formatPermission(permission: ToolPermissionMode, t: ReturnType<typeof useI18n>['t']): string {
  return permission === 'auto' ? t('settings.permission.auto') : t('settings.permission.ask');
}
