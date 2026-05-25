import { ExternalLink, MessageSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Composer } from '../../features/send-message/Composer';
import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type { AgentState } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';
import { MessageList } from '../../widgets/message-list/MessageList';
import { AgentSettingsModal } from './AgentSettingsModal';
import { AgentSettingsSummary, ComposerContextSummary } from './AgentSettingsSummary';
import { ApprovalPromptModal } from './ApprovalPromptModal';
import { ChatListModal } from './ChatListModal';

type ChatPageProps = {
  state: AgentState;
};

export function ChatPage({ state }: ChatPageProps) {
  const [chatsOpen, setChatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [approvalMinimized, setApprovalMinimized] = useState(false);
  const [resolvedApprovalId, setResolvedApprovalId] = useState<string | undefined>();
  const activeMode = state.agentModes.find((mode) => mode.id === state.agentMode);
  const chats = useSortedChats(state);
  const pendingApproval = state.activeChat.messages.find((message) => message.approval === 'pending');
  const pendingApprovalId = pendingApproval?.id;

  useEffect(() => {
    if (pendingApprovalId) {
      setApprovalMinimized(false);
      setResolvedApprovalId(undefined);
    }
  }, [pendingApprovalId]);

  return (
    <div className="relative flex h-screen flex-col bg-transparent text-[var(--vscode-foreground)]">
      <FloatingChatActions onOpenChats={() => setChatsOpen(true)} activeChatId={state.activeChat.id} />
      <MessageList
        messages={state.activeChat.messages}
        previousChat={state.activeChat.previousChat}
        compactedAt={state.activeChat.compactedAt}
        tools={state.tools}
        activeMode={activeMode}
        instructionSources={state.instructionSources}
        promptConfig={state.promptConfig}
        busy={state.activeChat.busy}
        activity={state.activeChat.activity}
        activityDetail={state.activeChat.activityDetail}
        bottomOffset="composer"
        resolvedApprovalId={resolvedApprovalId}
      />
      <Composer
        busy={state.activeChat.busy}
        floating
        settings={<AgentSettingsSummary state={state} onOpen={() => setSettingsOpen(true)} />}
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
      {settingsOpen ? <AgentSettingsModal state={state} onClose={() => setSettingsOpen(false)} /> : null}
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

function FloatingChatActions({ onOpenChats, activeChatId }: { onOpenChats(): void; activeChatId: string }) {
  const { t } = useI18n();

  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
      <IconButton title={t('chat.openChats')} onClick={onOpenChats}>
        <MessageSquare size={15} />
      </IconButton>
      <IconButton
        title={t('chat.openInEditor')}
        onClick={() => vscode.postMessage({ type: 'openChatInEditor', chatId: activeChatId })}
      >
        <ExternalLink size={15} />
      </IconButton>
    </div>
  );
}

function useSortedChats(state: AgentState) {
  return useMemo(
    () => [...state.chats].sort((a, b) => b.lastMessageAt - a.lastMessageAt || b.updatedAt - a.updatedAt),
    [state.chats]
  );
}
