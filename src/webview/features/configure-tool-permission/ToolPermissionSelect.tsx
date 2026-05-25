import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type { ToolPermissionMode } from '../../shared/types';
import { ToolIcon } from '../../shared/ui/ToolIcon';
import styles from './ToolPermissionSelect.module.scss';
import type { ToolPermissionSelectProps } from './types';
import { formatPermission } from './utils';

/**
 * Что это: строка настройки доступа для одного tool.
 * Зачем нужно: пользователь видит назначение tool, дефолтное право и может переопределить permission без перехода в JSON-настройки.
 */
export function ToolPermissionSelect({ item }: ToolPermissionSelectProps) {
  const { t } = useI18n();

  return (
    <article className={styles.root}>
      <div className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.title}>
            <ToolIcon name={item.name} />
            <span>{t(`tool.label.${item.name}` as never)}</span>
          </div>
          <p className={styles.description}>{t(`tool.description.${item.name}` as never)}</p>
          <p className={styles.defaultPermission}>
            {t('settings.permission.default', { permission: formatPermission(item.defaultPermission, t) })}
          </p>
        </div>
        <select
          className={styles.select}
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
