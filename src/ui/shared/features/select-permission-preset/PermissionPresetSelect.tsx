import { ShieldCheck } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import styles from './PermissionPresetSelect.module.scss';
import type { PermissionPresetSelectProps } from './types';
import { getSelectedDescription } from './utils';

/**
 * Что это: select для быстрого применения набора прав доступа к инструментам.
 * Зачем нужно: preset меняет много permission сразу, а custom-состояние показывает расхождение с preset и не отправляется обратно как значение.
 */
export function PermissionPresetSelect({ presets, activeId, disabled, className = '' }: PermissionPresetSelectProps) {
  const { t } = useI18n();

  return (
    <label className={className ? `${styles.root} ${className}` : styles.root}>
      <span className={styles.label}>
        <ShieldCheck size={14} className={styles.icon} />
        <span>{t('settings.permission.access')}</span>
      </span>
      <select
        className={styles.select}
        value={activeId}
        disabled={disabled}
        title={getSelectedDescription(presets, activeId, t)}
        onChange={(event) => {
          const presetId = event.target.value;
          if (presetId !== 'custom') {
            agentActions.setToolPermissionPreset(presetId);
          }
        }}
      >
        {activeId === 'custom' ? <option value="custom">{t('common.custom')}</option> : null}
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {t(`settings.preset.${preset.id}.label` as never)}
          </option>
        ))}
      </select>
    </label>
  );
}
