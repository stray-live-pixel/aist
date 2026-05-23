import { Composer } from '../../features/send-message/Composer';
import type { AgentState } from '../../shared/types';
import { MessageList } from '../../widgets/message-list/MessageList';

type ChatPageProps = {
  state: AgentState;
};

export function ChatPage({ state }: ChatPageProps) {
  return (
    <div className="flex h-screen flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      <MessageList messages={state.activeChat.messages} tools={state.tools} />
      <Composer busy={state.activeChat.busy} model={state.activeChat.model} models={state.models} toolsCount={state.tools.length} />
    </div>
  );
}
