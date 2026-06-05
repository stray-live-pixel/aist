import { MessageCircleOff } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../i18n';
import { agentActions } from '../../../lib/agentActions';
import { CompactNavigationButton } from '../../../ui';
import styles from '../ChatPage.module.scss';

/**
 * Что это: compact-кнопка режима ответа без инструментов для текущего чата.
 * Зачем нужно: пользователь одним кликом просит модель дать прямой ответ без tool schemas и лишнего tool-loop.
 * Какую продуктовую проблему решает: быстрые вопросы получают быстрый ответ, а параллельные чаты сохраняют свои режимы работы.
 */
export const ToolsDisabledToggleButton = memo(function ToolsDisabledToggleButton({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const title = enabled ? t('summary.toolsDisabledOn') : t('summary.toolsDisabledOff');

  return (
    <CompactNavigationButton
      className={
        enabled ? `${styles.chatScopedModeToggle} ${styles.chatScopedModeToggleActive}` : styles.chatScopedModeToggle
      }
      icon={<MessageCircleOff size={12} />}
      title={title}
      label=""
      pressed={enabled}
      onClick={() => agentActions.setChatToolsDisabled(!enabled)}
    />
  );
});
