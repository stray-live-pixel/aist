import { useI18n } from '../../i18n';
import { agentActions } from '../../lib/agentActions';
import type { ToolPermissionMode } from '../../types';
import { ToolIcon } from '../../ui/ToolIcon';
import styles from './ToolPermissionSelect.module.scss';
import type { ToolPermissionSelectProps } from './types';
import { formatPermission } from './utils';

/**
 * Что это: строка настройки доступа для одного tool.
 * Зачем нужно: пользователь видит назначение tool, дефолтное право и может переопределить permission без перехода в JSON-настройки.
 */
export function ToolPermissionSelect({ item }: ToolPermissionSelectProps) {
  const { t } = useI18n();
  const label = item.label || t(`tool.label.${item.name}` as never);
  const description = item.source === 'project' ? item.description : t(`tool.description.${item.name}` as never);

  return (
    <article className={styles.root}>
      <div className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.title}>
            <ToolIcon name={item.name} />
            <span>{label}</span>
          </div>
          <p className={styles.description}>{description}</p>
          <p className={styles.defaultPermission}>
            {t('settings.permission.default', { permission: formatPermission(item.defaultPermission, t) })}
            {item.source === 'project' && item.version ? ` - ${item.version}` : ''}
          </p>
        </div>
        <div className={styles.controls}>
          {item.source === 'project' ? (
            <label className={styles.enableToggle}>
              <input
                type="checkbox"
                checked={item.enabled !== false}
                onChange={(event) => agentActions.setProjectToolEnabled(item.name, event.target.checked)}
              />
              <span>
                {t(item.enabled === false ? 'settings.projectTools.disabled' : 'settings.projectTools.enabled')}
              </span>
            </label>
          ) : null}
          <select
            className={styles.select}
            value={item.permission}
            disabled={item.source === 'project' && item.enabled === false}
            onChange={(event) => agentActions.setToolPermission(item.name, event.target.value as ToolPermissionMode)}
          >
            <option value="ask">{t('settings.permission.ask')}</option>
            <option value="auto">{t('settings.permission.auto')}</option>
          </select>
        </div>
      </div>
    </article>
  );
}
