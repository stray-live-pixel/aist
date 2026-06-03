import { Zap } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import { CompactNavigationButton } from '../../../shared/ui';
import styles from '../ChatPage.module.scss';

/**
 * Что это: compact-кнопка «Турбо tools» рядом с выбором режима агента.
 * Зачем нужно: пользователь одним кликом отключает обязательные reason/nextStep у инструментов.
 * Какую продуктовую проблему решает: задачи выполняются быстрее и дешевле по токенам, когда подробные пояснения tool-call не нужны.
 */
export const ToolCallNotesToggleButton = memo(function ToolCallNotesToggleButton({ required }: { required: boolean }) {
  const { t } = useI18n();
  const enabled = !required;
  const title = enabled ? t('summary.toolCallNotesTurboOn') : t('summary.toolCallNotesTurboOff');

  return (
    <CompactNavigationButton
      className={
        enabled ? `${styles.toolCallNotesToggle} ${styles.toolCallNotesToggleActive}` : styles.toolCallNotesToggle
      }
      icon={<Zap size={12} />}
      title={title}
      label=""
      pressed={enabled}
      onClick={() => agentActions.setToolCallNotesRequired(enabled)}
    />
  );
});
