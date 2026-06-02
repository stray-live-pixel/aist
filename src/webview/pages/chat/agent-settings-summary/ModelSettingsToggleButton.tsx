import { Cpu } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { AgentState } from '../../../shared/types';
import { CompactNavigationButton } from '../../../shared/ui';
import styles from '../ChatPage.module.scss';
import { getModelSettingsSummaryLabel, getModelSettingsTitle } from './modelSummary';

/**
 * Что это: кнопка открытия меню модели со всей важной сводкой в подписи.
 * Зачем нужно: пользователь видит текущую рабочую модель без пяти отдельных селектов в composer.
 * Какую проблему решает: подробные настройки модели доступны по клику и не перегружают основной ввод.
 */
export const ModelSettingsToggleButton = memo(function ModelSettingsToggleButton({
  state,
  open,
  onToggle
}: {
  state: AgentState;
  open: boolean;
  onToggle(): void;
}) {
  const { t } = useI18n();
  const label = getModelSettingsSummaryLabel({ state });
  const title = `${open ? 'Hide' : 'Show'} model controls: ${getModelSettingsTitle({ state })}`;

  return (
    <CompactNavigationButton
      className={open ? `${styles.modelSummaryButton} ${styles.modelSummaryButtonOpen}` : styles.modelSummaryButton}
      icon={<Cpu size={12} />}
      label={label || t('summary.model')}
      title={title}
      disabled={state.activeChat.busy}
      onClick={onToggle}
    />
  );
});
