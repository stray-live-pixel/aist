import { Archive, ExternalLink, MessageSquare } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Composer } from '../../features/send-message/Composer';
import { vscode } from '../../shared/lib/vscode';
import type { AgentState } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';
import { MessageList } from '../../widgets/message-list/MessageList';
import { AgentSettingsModal } from './AgentSettingsModal';
import { AgentSettingsSummary } from './AgentSettingsSummary';
import { ChatListModal } from './ChatListModal';

type ChatPageProps = {
  state: AgentState;
};

export function ChatPage({ state }: ChatPageProps) {
  const [chatsOpen, setChatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeMode = state.agentModes.find((mode) => mode.id === state.agentMode);
  const chats = useSortedChats(state);

  return (
    <div className="relative flex h-screen flex-col bg-transparent text-[var(--vscode-foreground)]">
      <FloatingChatActions
        onOpenChats={() => setChatsOpen(true)}
        activeChatId={state.activeChat.id}
        busy={state.activeChat.busy}
      />
      <MessageList
        messages={state.activeChat.messages}
        previousChat={state.activeChat.previousChat}
        compactedAt={state.activeChat.compactedAt}
        tools={state.tools}
        activeMode={activeMode}
        instructionSources={state.instructionSources}
        busy={state.activeChat.busy}
        activity={state.activeChat.activity}
        bottomOffset="composer"
      />
      <Composer
        busy={state.activeChat.busy}
        floating
        settings={<AgentSettingsSummary state={state} onOpen={() => setSettingsOpen(true)} />}
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
    </div>
  );
}

function FloatingChatActions({
  onOpenChats,
  activeChatId,
  busy
}: {
  onOpenChats(): void;
  activeChatId: string;
  busy: boolean;
}) {
  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
      <IconButton title="Open chats" onClick={onOpenChats}>
        <MessageSquare size={15} />
      </IconButton>
      <IconButton
        title="Open this chat in editor"
        onClick={() => vscode.postMessage({ type: 'openChatInEditor', chatId: activeChatId })}
      >
        <ExternalLink size={15} />
      </IconButton>
      <IconButton
        title="Compact chat context"
        disabled={busy}
        onClick={() => vscode.postMessage({ type: 'compactChat', chatId: activeChatId })}
      >
        <Archive size={15} />
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
