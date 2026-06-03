import { useEffect, useMemo, useState } from 'react';

import { Composer } from '../../../features';
import { agentActions } from '../../../shared/lib/agentActions';
import { useAgentState } from '../../../shared/lib/agentState';
import { findIsolationSessionByChatId, isIsolationSessionActive } from '../../../shared/lib/isolation';
import { useRenderPerformanceMetric } from '../../../shared/lib/useRenderPerformanceMetric';
import type { AgentAttachment } from '../../../shared/types';
import { MessageList } from '../../../widgets/message-list';
import { IsolationPage } from '../../isolation';
import type { SettingsPageId } from '../../permissions/permissions-page/types';
import {
  AgentSettingsSummary,
  ComposerContextSummary,
  ModelSettingsToggleButton,
  ToolCallNotesToggleButton,
  ToolsDisabledToggleButton
} from '../AgentSettingsSummary';
import { ApprovalPromptModal } from '../ApprovalPromptModal';
import { ChatListModal } from '../ChatListModal';
import styles from '../ChatPage.module.scss';
import { applyChatTransientState, clearConfirmedTransientState } from '../applyChatTransientState';
import { type ChatTransientState } from '../chatTransientState';
import { ComposerNoticeStack } from './ComposerNoticeStack';
import { FloatingChatActions } from './FloatingChatActions';
import { VcsToggleButton } from './VcsToggleButton';
import { formatChatModelLabel } from './formatChatModelLabel';
import { useSortedChats } from './useSortedChats';

export function ChatPage({ onOpenSettingsPage }: { onOpenSettingsPage(page?: SettingsPageId): void }) {
  const state = useAgentState();
  useRenderPerformanceMetric({
    component: 'ChatPage',
    chatId: state.activeChat.id,
    messageCount: state.activeChat.messages.length
  });
  const [transient, setTransient] = useState<ChatTransientState>({});
  const transientView = useMemo(
    () => applyChatTransientState({ chat: state.activeChat, transient }),
    [state.activeChat, transient]
  );
  const [chatsOpen, setChatsOpen] = useState(false);
  const [approvalMinimized, setApprovalMinimized] = useState(false);
  const [vcsPanelOpen, setVcsPanelOpen] = useState(false);
  const [isolationOpen, setIsolationOpen] = useState(false);
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [windowFocused, setWindowFocused] = useState(() => document.hasFocus());
  const [resolvedApprovalId, setResolvedApprovalId] = useState<string | undefined>();
  const chats = useSortedChats(state);
  const isolationSession = findIsolationSessionByChatId({ state, chatId: state.activeChat.id });
  const isolationSessionActive = isolationSession
    ? isIsolationSessionActive({ status: isolationSession.status })
    : false;
  const pendingApproval = state.activeChat.messages.find((message) => message.approval === 'pending');
  const pendingApprovalId = pendingApproval?.id;

  useEffect(() => {
    setTransient((current) => clearConfirmedTransientState({ chat: state.activeChat, transient: current }));
  }, [state.activeChat]);

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
      onOpenSettingsPage('vcs');
      return;
    }
    setVcsPanelOpen((current) => !current);
  }

  function toggleModelPanel() {
    setModelPanelOpen((current) => !current);
  }

  const composerBusy = transientView.busy || isolationSessionActive;
  const composerMinimized = composerBusy && state.composerUiSettings.minimizeOnBlur && !windowFocused;

  function handleSubmitPrompt(
    prompt: string,
    options: { continueWithoutUserPrompt?: boolean; attachments?: AgentAttachment[] } = {}
  ) {
    const visiblePrompt = options.continueWithoutUserPrompt ? '' : prompt.trim();
    if (visiblePrompt || options.attachments?.length) {
      setTransient((current) => ({
        ...current,
        submittingChatId: state.activeChat.id,
        submittingPrompt: visiblePrompt || prompt,
        submittingAttachments: options.attachments
      }));
    }

    if (isolationSession && !isolationSessionActive) {
      agentActions.continueIsolationSession(isolationSession.sessionId, prompt);
      return;
    }

    agentActions.ask(prompt, options);
  }

  function handleStopRequested() {
    setTransient((current) => ({ ...current, stoppingChatId: state.activeChat.id }));
    if (isolationSession && isolationSessionActive) {
      agentActions.stopIsolationSession(isolationSession.sessionId);
      return;
    }

    agentActions.stop(state.activeChat.id);
  }

  return (
    <div className={styles.root}>
      <MessageList
        chatId={state.activeChat.id}
        messages={transientView.messages}
        previousChat={state.activeChat.previousChat}
        compactedAt={state.activeChat.compactedAt}
        compactionModel={state.activeChat.compactionModel}
        activePlan={state.activeChat.activePlan}
        tools={state.tools}
        assistantLabel={formatChatModelLabel(state.activeChat.model)}
        busy={composerBusy}
        activity={transientView.activity}
        activityDetail={transientView.activityDetail}
        modelRequest={state.activeChat.modelRequest}
        subagentRuns={state.subagentRuns}
        memoryReflectionCandidates={state.activeChat.reflectionCandidates || []}
        bottomOffset="composer"
        resolvedApprovalId={resolvedApprovalId}
      />
      <Composer
        chatId={state.activeChat.id}
        busy={transientView.busy}
        floating
        minimized={composerMinimized}
        gradientWhileBusy={state.composerUiSettings.gradientWhileBusy}
        onSubmitPrompt={handleSubmitPrompt}
        onStopRequested={handleStopRequested}
        settings={<AgentSettingsSummary state={state} onOpen={onOpenSettingsPage} />}
        headerActions={
          <FloatingChatActions
            extensionVersion={state.extensionVersion}
            onNewChat={() => agentActions.newChat()}
            onOpenChats={() => setChatsOpen(true)}
            onOpenSettings={() => onOpenSettingsPage()}
            onOpenIsolation={() => setIsolationOpen(true)}
            activeChatId={state.activeChat.id}
            vcsToggle={
              <VcsToggleButton
                state={state}
                open={vcsPanelOpen}
                onToggle={toggleVcsPanel}
                onOpenVcsSettings={() => onOpenSettingsPage('vcs')}
              />
            }
          />
        }
        footer={
          <ComposerContextSummary
            state={state}
            modelControl={<ModelSettingsToggleButton state={state} open={modelPanelOpen} onToggle={toggleModelPanel} />}
          />
        }
        footerControls={
          <>
            <ToolsDisabledToggleButton enabled={state.activeChat.modelSettings.toolsDisabled} />
            <ToolCallNotesToggleButton required={state.toolCallNotesRequired} />
          </>
        }
        notice={
          <ComposerNoticeStack
            state={state}
            composerMinimized={composerMinimized}
            modelPanelOpen={modelPanelOpen}
            vcsPanelOpen={vcsPanelOpen}
            pendingApproval={pendingApproval}
            approvalMinimized={approvalMinimized}
            isolationSession={isolationSession}
            onApprovalMinimize={() => setApprovalMinimized(true)}
            onApprovalRestore={() => setApprovalMinimized(false)}
            onApprovalResolved={() => setResolvedApprovalId(pendingApproval?.id)}
            onOpenSettingsPage={onOpenSettingsPage}
          />
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
      {isolationOpen ? <IsolationPage onClose={() => setIsolationOpen(false)} /> : null}
    </div>
  );
}
