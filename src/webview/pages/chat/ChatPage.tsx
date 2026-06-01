import {
  Braces,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequestCreate,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings
} from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import { Composer } from '../../features';
import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { useAgentState } from '../../shared/lib/agentState';
import type { AgentState } from '../../shared/types';
import { CompactNavigationButton } from '../../shared/ui';
import { MessageList } from '../../widgets/message-list';
import { AgentSettingsSummary, ComposerContextSummary } from './AgentSettingsSummary';
import { ApprovalPromptModal } from './ApprovalPromptModal';
import { ChatListModal } from './ChatListModal';
import styles from './ChatPage.module.scss';

/**
 * Что это: корневая страница активного чата.
 * Зачем нужно: держит только состояние модалок/approval и прокидывает уже подготовленные данные в виджеты чата.
 */
export function ChatPage({ onOpenSettingsPage }: { onOpenSettingsPage(): void }) {
  const state = useAgentState();
  const [chatsOpen, setChatsOpen] = useState(false);
  const [approvalMinimized, setApprovalMinimized] = useState(false);
  const [vcsPanelOpen, setVcsPanelOpen] = useState(false);
  const [windowFocused, setWindowFocused] = useState(() => document.hasFocus());
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
    const updateFocus = () => setWindowFocused(document.hasFocus());

    window.addEventListener('focus', updateFocus);
    window.addEventListener('blur', updateFocus);
    document.addEventListener('visibilitychange', updateFocus);
    updateFocus();

    return () => {
      window.removeEventListener('focus', updateFocus);
      window.removeEventListener('blur', updateFocus);
      document.removeEventListener('visibilitychange', updateFocus);
    };
  }, []);

  useEffect(() => {
    if (!state.activeChat.vcs?.branch) {
      agentActions.refreshVcs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeChat.id]);

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

  function toggleVcsPanel() {
    if (!state.activeChat.vcs?.branch) {
      agentActions.refreshVcs();
    }
    setVcsPanelOpen((current) => !current);
  }

  const composerMinimized = state.activeChat.busy && state.composerUiSettings.minimizeOnBlur && !windowFocused;

  return (
    <div className={styles.root}>
      <MessageList
        chatId={state.activeChat.id}
        messages={state.activeChat.messages}
        previousChat={state.activeChat.previousChat}
        compactedAt={state.activeChat.compactedAt}
        compactionModel={state.activeChat.compactionModel}
        activePlan={state.activeChat.activePlan}
        tools={state.tools}
        assistantLabel={formatChatModelLabel(state.activeChat.model)}
        busy={state.activeChat.busy}
        activity={state.activeChat.activity}
        activityDetail={state.activeChat.activityDetail}
        modelRequest={state.activeChat.modelRequest}
        subagentRuns={state.subagentRuns}
        memoryReflectionCandidates={state.activeChat.reflectionCandidates || []}
        bottomOffset="composer"
        resolvedApprovalId={resolvedApprovalId}
      />
      <Composer
        chatId={state.activeChat.id}
        busy={state.activeChat.busy}
        floating
        minimized={composerMinimized}
        gradientWhileBusy={state.composerUiSettings.gradientWhileBusy}
        settings={<AgentSettingsSummary state={state} onOpen={onOpenSettingsPage} />}
        headerActions={
          <>
            <VcsToggleButton state={state} open={vcsPanelOpen} onToggle={toggleVcsPanel} />
            <FloatingChatActions
              extensionVersion={state.extensionVersion}
              onNewChat={() => agentActions.newChat()}
              onOpenChats={() => setChatsOpen(true)}
              onOpenSettings={onOpenSettingsPage}
              activeChatId={state.activeChat.id}
            />
          </>
        }
        footer={<ComposerContextSummary state={state} />}
        notice={
          vcsPanelOpen || (pendingApproval && approvalMinimized) ? (
            <div className={styles.composerNoticeStack}>
              {vcsPanelOpen ? <VcsControls state={state} minimized={composerMinimized} /> : null}
              {pendingApproval && approvalMinimized ? (
                <ApprovalPromptModal
                  message={pendingApproval}
                  settings={state.approvalNotificationSettings}
                  minimized
                  onMinimize={() => setApprovalMinimized(true)}
                  onRestore={() => setApprovalMinimized(false)}
                  onResolved={() => setResolvedApprovalId(pendingApproval.id)}
                />
              ) : null}
            </div>
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

const VcsToggleButton = memo(function VcsToggleButton({
  state,
  open,
  onToggle
}: {
  state: AgentState;
  open: boolean;
  onToggle(): void;
}) {
  const branch = state.activeChat.vcs?.branch;
  const shortBranch = branch ? (branch.length > 8 ? branch.slice(-8) : branch) : 'VCS';
  const title = branch ? (open ? `Hide VCS controls: ${branch}` : `Show VCS controls: ${branch}`) : 'Show VCS controls';

  return (
    <CompactNavigationButton icon={<GitBranch size={12} />} label={shortBranch} title={title} onClick={onToggle} />
  );
});

const VcsControls = memo(function VcsControls({ state, minimized }: { state: AgentState; minimized: boolean }) {
  const vcs = state.activeChat.vcs;
  const branchLabel = vcs?.branch || 'VCS';
  const disabled = state.activeChat.busy;
  const className = [styles.vcsControlsFloat, minimized ? styles.vcsControlsFloatCollapsed : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-label="VCS controls" aria-hidden={minimized}>
      <button
        type="button"
        className={styles.vcsBranchButton}
        title={vcs ? `${vcs.command}: ${vcs.branch}` : 'Refresh VCS branch'}
        onClick={() => agentActions.refreshVcs()}
      >
        <GitBranch size={12} />
        <span>{branchLabel}</span>
        <RefreshCw size={10} />
      </button>
      <CompactNavigationButton
        icon={<GitPullRequestCreate size={12} />}
        title="New isolated branch"
        disabled={disabled}
        onClick={() => agentActions.isolateChatVcs()}
      />
      <CompactNavigationButton
        icon={<GitCommitHorizontal size={12} />}
        title="Commit and push -f"
        disabled={disabled}
        onClick={() => agentActions.commitAndForcePushVcs()}
      />
      <CompactNavigationButton
        icon={<GitMerge size={12} />}
        title="Merge to main through current agent"
        disabled={disabled}
        onClick={() => agentActions.mergeToMainVcs()}
      />
    </div>
  );
});

const FloatingChatActions = memo(function FloatingChatActions({
  extensionVersion,
  onNewChat,
  onOpenChats,
  onOpenSettings,
  activeChatId
}: {
  /** Версия остаётся рядом с навигацией: это metadata composer, но выглядит как control для единообразия панели. */
  extensionVersion: string;
  onNewChat(): void;
  onOpenChats(): void;
  onOpenSettings(): void;
  activeChatId: string;
}) {
  const { t } = useI18n();
  const versionLabel = `v${extensionVersion}`;

  return (
    <div className={styles.floatingActions}>
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
      <CompactNavigationButton icon={<Plus size={12} />} title={t('chat.newChat')} onClick={onNewChat} />
      <CompactNavigationButton icon={<Settings size={12} />} title={t('chat.openSettings')} onClick={onOpenSettings} />
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

function formatChatModelLabel(model: string): string {
  const cleanModel = model
    .replace(/^openrouter[:/]/i, '')
    .replace(/^codex[:/]/i, '')
    .trim();

  return cleanModel || model || 'Agent';
}

function useSortedChats(state: AgentState) {
  return useMemo(
    () => [...state.chats].sort((a, b) => b.lastMessageAt - a.lastMessageAt || b.updatedAt - a.updatedAt),
    [state.chats]
  );
}
