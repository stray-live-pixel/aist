/**
 * Что это: область истории сообщений чата.
 * Зачем нужно: держит прокрутку истории и добавляет служебные элементы в начало чата.
 * Пример использования: <MessageList messages={messages} tools={tools} activeMode={mode} busy={busy} />.
 */
import { type ReactNode, useLayoutEffect, useRef } from 'react';

import { MessageCard } from '../../../entities/message';
import { CopyMessageButton } from '../../../features';
import { AgentActivityStatus } from '../agent-activity-status';
import { EmptyState } from '../empty-state';
import { ToolCallsCut } from '../tool-calls-cut';
import styles from './MessageList.module.scss';
import type { MessageGroup, MessageListProps, PreviousChatHistoryProps } from './types';
import {
  getLastAssistantMessageId,
  groupMessages,
  isDefaultExpandedMessage,
  isNearBottom,
  scrollToBottom
} from './utils';

export function MessageList({
  messages,
  previousChat,
  compactedAt,
  tools: _tools,
  busy,
  activity,
  activityDetail,
  bottomOffset = 'none',
  resolvedApprovalId
}: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousGroupIdsRef = useRef<Set<string>>(new Set());
  const previousStackBottomRef = useRef<number | undefined>(undefined);
  const groups = groupMessages(messages, busy);
  const groupIds = groups.map(getMessageGroupId);
  const previousGroupIds = previousGroupIdsRef.current;
  const isInitialRender = previousStackBottomRef.current === undefined;
  const newGroupIds = isInitialRender
    ? new Set<string>()
    : new Set(groupIds.filter((groupId) => !previousGroupIds.has(groupId)));

  useLayoutEffect(() => {
    animateStackShift(stackRef.current, previousStackBottomRef.current);
    previousStackBottomRef.current = stackRef.current?.getBoundingClientRect().bottom;
    previousGroupIdsRef.current = new Set(groupIds);

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
      className={`${styles.root} ${bottomOffset === 'composer' ? styles.withComposerOffset : ''}`}
      onScroll={handleScroll}
    >
      <div ref={stackRef} className={styles.stack}>
        {previousChat ? <PreviousChatHistory chat={previousChat} compactedAt={compactedAt} /> : null}
        {messages.length === 0 && !previousChat ? <EmptyState /> : null}
        {groups.map((group) => (
          <AnimatedMessageGroup key={getMessageGroupId(group)} animate={newGroupIds.has(getMessageGroupId(group))}>
            {renderMessageGroup(group, getLastAssistantMessageId(messages), resolvedApprovalId)}
          </AnimatedMessageGroup>
        ))}
        {busy ? <AgentActivityStatus activity={activity} detail={activityDetail} /> : null}
      </div>
    </main>
  );
}

function AnimatedMessageGroup({ children, animate }: { children: ReactNode; animate: boolean }) {
  return <div className={animate ? styles.messageEnter : styles.messageItem}>{children}</div>;
}

function getMessageGroupId(group: MessageGroup): string {
  return group.type === 'toolCalls' ? group.id : group.message.id;
}

/**
 * Делает FLIP-анимацию смещения всей колонки сообщений: layout уже изменился, а мы возвращаем слой transform'ом
 * в старую позицию и отпускаем его transition'ом. Так браузер анимирует compositor-свойство, не height/top.
 */
function animateStackShift(element: HTMLElement | null, previousBottom: number | undefined): void {
  if (!element || previousBottom === undefined || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const nextBottom = element.getBoundingClientRect().bottom;
  const delta = previousBottom - nextBottom;
  if (Math.abs(delta) < 1) {
    return;
  }

  element.style.transition = 'none';
  element.style.transform = `translate3d(0, ${delta}px, 0)`;
  element.style.willChange = 'transform';
  void element.offsetHeight;
  element.style.transition = 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)';
  element.style.transform = 'translate3d(0, 0, 0)';
  window.setTimeout(() => {
    element.style.transition = '';
    element.style.transform = '';
    element.style.willChange = '';
  }, 500);
}

function PreviousChatHistory({ chat, compactedAt }: PreviousChatHistoryProps) {
  const groups = groupMessages(chat.messages, false);

  return (
    <>
      {groups.map((group) => renderMessageGroup(group, getLastAssistantMessageId(chat.messages)))}
      <div className={styles.compactionDivider}>
        <span className={styles.compactionLine} />
        <span className={styles.compactionLabel}>
          Context compacted{compactedAt ? ` · ${new Date(compactedAt).toLocaleString()}` : ''}
        </span>
        <span className={styles.compactionLine} />
      </div>
    </>
  );
}

function renderMessageGroup(group: MessageGroup, lastAssistantMessageId?: string, resolvedApprovalId?: string) {
  if (group.type === 'toolCalls') {
    return (
      <ToolCallsCut
        key={group.id}
        tools={group.tools}
        userMessage={group.userMessage}
        assistantMessage={group.assistantMessage}
        active={group.active}
        resolvedApprovalId={resolvedApprovalId}
      />
    );
  }

  return (
    <MessageCard
      message={group.message}
      defaultExpanded={isDefaultExpandedMessage(group.message, lastAssistantMessageId)}
      collapseToolId={resolvedApprovalId}
      actions={group.message.content ? <CopyMessageButton markdown={group.message.content} /> : null}
    />
  );
}
