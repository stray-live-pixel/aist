/**
 * Что это: область истории сообщений чата.
 * Зачем нужно: держит прокрутку истории и добавляет служебные элементы в начало чата.
 * Пример использования: <MessageList messages={messages} tools={tools} activeMode={mode} busy={busy} />.
 */
import { useLayoutEffect, useRef } from 'react';

import { MessageCard } from '../../entities/message/MessageCard';
import { CopyMessageButton } from '../../features/copy-message/CopyMessageButton';
import type { AgentMode, Chat, ChatMessage } from '../../shared/types';
import { AgentActivityStatus } from './AgentActivityStatus';
import { EmptyState } from './EmptyState';
import { SystemInstructionLabel } from './SystemInstructionLabel';

const STICKY_BOTTOM_THRESHOLD_PX = 50;

type MessageListProps = {
  messages: ChatMessage[];
  tools: string[];
  activeMode: AgentMode | undefined;
  busy: boolean;
  activity: Chat['activity'];
  bottomOffset?: 'none' | 'composer';
};

export function MessageList({ messages, tools, activeMode, busy, activity, bottomOffset = 'none' }: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const bottomOffsetClass = bottomOffset === 'composer' ? 'pb-72' : '';

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
    <main
      ref={scrollRef}
      className={`min-h-0 flex-1 overflow-y-auto bg-transparent px-3 py-3 [scrollbar-gutter:stable_both-edges] ${bottomOffsetClass}`}
      onScroll={handleScroll}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <SystemInstructionLabel mode={activeMode} />
        {messages.length === 0 ? <EmptyState tools={tools} /> : null}
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            actions={message.content ? <CopyMessageButton markdown={message.content} /> : null}
          />
        ))}
        {busy ? <AgentActivityStatus activity={activity} /> : null}
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
