import { Archive, LoaderCircle } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentState } from '../../../shared/types';
import { CompactControlGroup, CompactNavigationButton } from '../../../shared/ui';
import styles from '../ChatPage.module.scss';
import { ContextUsage } from './ContextUsage';

/**
 * Что это: компактные controls состояния чата рядом с профилем агента.
 * Зачем нужно: пользователь может запустить compaction и видеть контекст прямо над composer.
 * Какую проблему решает: важные действия с текущим чатом доступны без открытия меню.
 */
export const ComposerContextControls = memo(function ComposerContextControls({ state }: { state: AgentState }) {
  const { t } = useI18n();
  const [compactingChatId, setCompactingChatId] = useState<string | undefined>();
  const compacting = compactingChatId === state.activeChat.id;

  useEffect(() => {
    if (compactingChatId && state.activeChat.id !== compactingChatId) {
      setCompactingChatId(undefined);
    }
  }, [compactingChatId, state.activeChat.id]);

  return (
    <CompactControlGroup inline>
      <CompactNavigationButton
        className={styles.compactChatButton}
        icon={compacting ? <LoaderCircle className={styles.compactionSpinner} size={12} /> : <Archive size={12} />}
        title={t('summary.compactTitle')}
        disabled={state.activeChat.busy || compacting}
        onClick={() => {
          setCompactingChatId(state.activeChat.id);
          agentActions.compactChat(state.activeChat.id);
        }}
      />
      <ContextUsage context={state.activeChat.context} />
    </CompactControlGroup>
  );
});
