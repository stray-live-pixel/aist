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
import { ToolCallsCut } from './ToolCallsCut';

const STICKY_BOTTOM_THRESHOLD_PX = 50;

type MessageListProps = {
  messages: ChatMessage[];
  tools: string[];
  activeMode: AgentMode | undefined;
  busy: boolean;
  activity: Chat['activity'];
  bottomOffset?: 'none' | 'composer';
};

type MessageGroup =
  | { type: 'single'; message: ChatMessage }
  | {
      type: 'toolCalls';
      id: string;
      userMessage?: ChatMessage;
      assistantMessage?: ChatMessage;
      tools: ChatMessage[];
      active: boolean;
    };

export function MessageList({ messages, tools, activeMode, busy, activity, bottomOffset = 'none' }: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const bottomOffsetClass = bottomOffset === 'composer' ? 'pb-72' : '';
  const groups = groupMessages(messages, busy);

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
      className={`min-h-0 flex-1 overflow-y-auto bg-transparent px-3 py-3 [scrollbar-gutter:stable] ${bottomOffsetClass}`}
      onScroll={handleScroll}
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        <SystemInstructionLabel mode={activeMode} />
        {messages.length === 0 ? <EmptyState tools={tools} /> : null}
        {groups.map((group) => renderMessageGroup(group))}
        {busy ? <AgentActivityStatus activity={activity} /> : null}
      </div>
    </main>
  );
}

function renderMessageGroup(group: MessageGroup) {
  if (group.type === 'toolCalls') {
    return (
      <ToolCallsCut
        key={group.id}
        tools={group.tools}
        userMessage={group.userMessage}
        assistantMessage={group.assistantMessage}
        active={group.active}
      />
    );
  }

  return (
    <MessageCard
      key={group.message.id}
      message={group.message}
      actions={group.message.content ? <CopyMessageButton markdown={group.message.content} /> : null}
    />
  );
}

function groupMessages(messages: ChatMessage[], busy: boolean): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentUserMessage: ChatMessage | undefined;
  let pendingTools: ChatMessage[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      flushToolCalls(groups, currentUserMessage, pendingTools, undefined, busy);
      pendingTools = [];
      currentUserMessage = message;
      groups.push({ type: 'single', message });
      continue;
    }

    if (message.role === 'tool') {
      pendingTools.push(message);
      continue;
    }

    if (message.role === 'assistant' && pendingTools.length) {
      flushToolCalls(groups, currentUserMessage, pendingTools, message, false);
      pendingTools = [];
      groups.push({ type: 'single', message });
      currentUserMessage = undefined;
      continue;
    }

    flushToolCalls(groups, currentUserMessage, pendingTools, undefined, busy);
    pendingTools = [];
    groups.push({ type: 'single', message });
  }

  flushToolCalls(groups, currentUserMessage, pendingTools, undefined, busy);
  return groups;
}

function flushToolCalls(
  groups: MessageGroup[],
  userMessage: ChatMessage | undefined,
  tools: ChatMessage[],
  assistantMessage: ChatMessage | undefined,
  active: boolean
) {
  if (!tools.length) {
    return;
  }

  groups.push({
    type: 'toolCalls',
    id: `tool-calls-${tools[0].id}`,
    userMessage,
    assistantMessage,
    tools: [...tools],
    active
  });
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
