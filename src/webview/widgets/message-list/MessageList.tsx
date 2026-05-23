import { MessageCard } from '../../entities/message/MessageCard';
import { CopyMessageButton } from '../../features/copy-message/CopyMessageButton';
import type { ChatMessage } from '../../shared/types';
import { EmptyState } from './EmptyState';

type MessageListProps = {
  messages: ChatMessage[];
  tools: string[];
};

export function MessageList({ messages, tools }: MessageListProps) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? <EmptyState tools={tools} /> : null}
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            actions={message.content ? <CopyMessageButton markdown={message.content} /> : null}
          />
        ))}
      </div>
    </main>
  );
}
