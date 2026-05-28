import { Braces, ExternalLink, MessageSquare } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { Composer } from '../../features';
import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { useAgentState } from '../../shared/lib/agentState';
import type { AgentState } from '../../shared/types';
import { CompactNavigationButton } from '../../shared/ui';
import { MessageList } from '../../widgets/message-list';
import type { SettingsPageId } from '../permissions/permissions-page/types';
import { AgentSettingsModal } from './AgentSettingsModal';
import { AgentSettingsSummary, ComposerContextSummary } from './AgentSettingsSummary';
import { ApprovalPromptModal } from './ApprovalPromptModal';
import { ChatListModal } from './ChatListModal';
import styles from './ChatPage.module.scss';

/**
 * Что это: корневая страница активного чата.
 * Зачем нужно: держит только состояние модалок/approval и прокидывает уже подготовленные данные в виджеты чата.
 */
export function ChatPage() {
  const state = useAgentState();
  const [chatsOpen, setChatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsPageId>('overview');
  const [approvalMinimized, setApprovalMinimized] = useState(false);
  const [resolvedApprovalId, setResolvedApprovalId] = useState<string | undefined>();
  const chats = useSortedChats(state);
  const pendingApproval = state.activeChat.messages.find((message) => message.approval === 'pending');
  const pendingApprovalId = pendingApproval?.id;

  useEffect(() => {
    if (pendingApprovalId) {
      setApprovalMinimized(false);
      setResolvedApprovalId(undefined);
    }
  }, [pendingApprovalId]);

  useEffect(() => {
    /**
     * Системная view/title-кнопка живёт вне React-дерева, поэтому открытие списка чатов
     * приходит отдельным IPC-событием и переиспользует локальное состояние модалки.
     */
    const listener = (event: MessageEvent<{ type: string }>) => {
      if (event.data.type === 'showChats') {
        setChatsOpen(true);
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  function openSettings(page: SettingsPageId = 'overview') {
    setSettingsInitialPage(page);
    setSettingsOpen(true);
  }

  return (
    <div className={styles.root}>
      <MessageList
        messages={state.activeChat.messages}
        previousChat={state.activeChat.previousChat}
        compactedAt={state.activeChat.compactedAt}
        activePlan={state.activeChat.activePlan}
        tools={state.tools}
        busy={state.activeChat.busy}
        activity={state.activeChat.activity}
        activityDetail={state.activeChat.activityDetail}
        modelRequest={state.activeChat.modelRequest}
        bottomOffset="composer"
        resolvedApprovalId={resolvedApprovalId}
      />
      <Composer
        chatId={state.activeChat.id}
        busy={state.activeChat.busy}
        floating
        settings={
          <AgentSettingsSummary
            state={state}
            onOpen={openSettings}
            actions={
              <FloatingChatActions
                extensionVersion={state.extensionVersion}
                onOpenChats={() => setChatsOpen(true)}
                activeChatId={state.activeChat.id}
              />
            }
          />
        }
        footer={<ComposerContextSummary state={state} />}
        notice={
          pendingApproval && approvalMinimized ? (
            <ApprovalPromptModal
              message={pendingApproval}
              settings={state.approvalNotificationSettings}
              minimized
              onMinimize={() => setApprovalMinimized(true)}
              onRestore={() => setApprovalMinimized(false)}
              onResolved={() => setResolvedApprovalId(pendingApproval.id)}
            />
          ) : undefined
        }
      />
      {chatsOpen ? (
        <ChatListModal
          chats={chats}
          activeChatId={state.activeChat.id}
          language={state.agentLanguage}
          onClose={() => setChatsOpen(false)}
        />
      ) : null}
      {settingsOpen ? (
        <AgentSettingsModal initialPage={settingsInitialPage} onClose={() => setSettingsOpen(false)} />
      ) : null}
      {pendingApproval && !approvalMinimized ? (
        <ApprovalPromptModal
          message={pendingApproval}
          settings={state.approvalNotificationSettings}
          minimized={false}
          onMinimize={() => setApprovalMinimized(true)}
          onRestore={() => setApprovalMinimized(false)}
          onResolved={() => setResolvedApprovalId(pendingApproval.id)}
        />
      ) : null}
    </div>
  );
}

const FloatingChatActions = memo(function FloatingChatActions({
  extensionVersion,
  onOpenChats,
  activeChatId
}: {
  /** Версия остаётся рядом с навигацией: это metadata composer, но выглядит как control для единообразия панели. */
  extensionVersion: string;
  onOpenChats(): void;
  activeChatId: string;
}) {
  const { t } = useI18n();
  const versionLabel = `v${extensionVersion}`;

  return (
    <div className={styles.floatingActions}>
      <CompactNavigationButton label={versionLabel} title={versionLabel} disabled onClick={() => undefined} />
      <CompactNavigationButton icon={<MessageSquare size={12} />} title={t('chat.openChats')} onClick={onOpenChats} />
      <CompactNavigationButton
        icon={<ExternalLink size={12} />}
        title={t('chat.openInEditor')}
        onClick={() => agentActions.openChatInEditor(activeChatId)}
      />
      <CompactNavigationButton
        icon={<Braces size={12} />}
        title={t('chat.openJson')}
        onClick={() => agentActions.openChatJson(activeChatId)}
      />
    </div>
  );
});

function useSortedChats(state: AgentState) {
  return useMemo(
    () => [...state.chats].sort((a, b) => b.lastMessageAt - a.lastMessageAt || b.updatedAt - a.updatedAt),
    [state.chats]
  );
}
