import { Braces, ExternalLink, MessageSquare, Plus, Server, Settings } from 'lucide-react';
import { type ReactNode, memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import { CompactNavigationButton } from '../../../shared/ui';
import styles from '../ChatPage.module.scss';

export const FloatingChatActions = memo(function FloatingChatActions({
  extensionVersion,
  onNewChat,
  onOpenChats,
  onOpenSettings,
  onOpenIsolation,
  activeChatId,
  vcsToggle
}: {
  /** Версия остаётся рядом с навигацией: это metadata composer, но выглядит как control для единообразия панели. */
  extensionVersion: string;
  onNewChat(): void;
  onOpenChats(): void;
  onOpenSettings(): void;
  onOpenIsolation(): void;
  activeChatId: string;
  /** Кнопка ветки передаётся слотом, чтобы порядок всех composer-actions оставался в одном месте. */
  vcsToggle: ReactNode;
}) {
  const { t } = useI18n();
  const versionLabel = `v${extensionVersion}`;

  return (
    <div className={styles.floatingActions}>
      <CompactNavigationButton icon={<Plus size={12} />} title={t('chat.newChat')} onClick={onNewChat} />
      <CompactNavigationButton icon={<MessageSquare size={12} />} title={t('chat.openChats')} onClick={onOpenChats} />
      <CompactNavigationButton
        className={styles.hideComposerNarrow}
        icon={<ExternalLink size={12} />}
        title={t('chat.openInEditor')}
        onClick={() => agentActions.openChatInEditor(activeChatId)}
      />
      <CompactNavigationButton
        className={styles.hideComposerNarrow}
        icon={<Braces size={12} />}
        title={t('chat.openJson')}
        onClick={() => agentActions.openChatJson(activeChatId)}
      />
      <CompactNavigationButton icon={<Server size={12} />} title="Isolated agents" onClick={onOpenIsolation} />
      <CompactNavigationButton icon={<Settings size={12} />} title={t('chat.openSettings')} onClick={onOpenSettings} />
      {vcsToggle}
      <CompactNavigationButton
        className={styles.hideComposerNarrow}
        label={versionLabel}
        title={versionLabel}
        disabled
        onClick={() => undefined}
      />
    </div>
  );
});
