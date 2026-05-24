/**
 * Что это: область истории сообщений чата.
 * Зачем нужно: держит прокрутку истории и добавляет служебные элементы в начало чата.
 * Пример использования: <MessageList messages={messages} tools={tools} activeMode={mode} />.
 */
import { useLayoutEffect, useRef } from 'react';

import { MessageCard } from '../../entities/message/MessageCard';
import { CopyMessageButton } from '../../features/copy-message/CopyMessageButton';
import type { AgentMode, ChatMessage } from '../../shared/types';
import { EmptyState } from './EmptyState';
import { SystemInstructionLabel } from './SystemInstructionLabel';

const STICKY_BOTTOM_THRESHOLD_PX = 50;

type MessageListProps = {
  messages: ChatMessage[];
  tools: string[];
  activeMode: AgentMode | undefined;
};

export function MessageList({ messages, tools, activeMode }: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);

  useLayoutEffect(() => {
    if (!shouldStickToBottomRef.current) {
      return;
    }

    scrollToBottom(scrollRef.current);
  });

  function handleScroll() {
    shouldStickToBottomRef.current = isNearBottom(scrollRef.current);
  }

  return (
    <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" onScroll={handleScroll}>
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <SystemInstructionLabel mode={activeMode} />
        {messages.length === 0 ? <EmptyState tools={tools} /> : null}
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

function isNearBottom(element: HTMLElement | null): boolean {
  if (!element) {
    return true;
  }

  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceToBottom < STICKY_BOTTOM_THRESHOLD_PX;
}

function scrollToBottom(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  element.scrollTop = element.scrollHeight;
}
