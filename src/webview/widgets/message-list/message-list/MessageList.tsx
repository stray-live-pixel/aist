/**
 * Что это: область истории сообщений чата.
 * Зачем нужно: держит прокрутку истории и добавляет служебные элементы в начало чата.
 * Пример использования: <MessageList messages={messages} tools={tools} activeMode={mode} busy={busy} />.
 */
import { type ReactNode, useLayoutEffect, useRef } from 'react';

import { MessageCard } from '../../../entities/message';
import { AnalyzeMemoryButton, CopyMessageButton } from '../../../features';
import type { ChatMessage } from '../../../shared/types';
import { ActivePlanWidget } from '../active-plan';
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
  chatId,
  messages,
  previousChat,
  compactedAt,
  compactionModel,
  activePlan,
  tools: _tools,
  busy,
  activity,
  activityDetail,
  modelRequest,
  bottomOffset = 'none',
  resolvedApprovalId
}: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousGroupIdsRef = useRef<Set<string>>(new Set());
  const hasRenderedRef = useRef(false);
  const groups = groupMessages(messages, busy);
  const groupIds = groups.map(getMessageGroupId);
  const previousGroupIds = previousGroupIdsRef.current;
  const newGroupIds = hasRenderedRef.current
    ? new Set(groupIds.filter((groupId) => !previousGroupIds.has(groupId)))
    : new Set<string>();

  useLayoutEffect(() => {
    previousGroupIdsRef.current = new Set(groupIds);
    hasRenderedRef.current = true;

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
      <div className={styles.stack}>
        {activePlan ? <ActivePlanWidget plan={activePlan} /> : null}
        {previousChat ? (
          <PreviousChatHistory chat={previousChat} compactedAt={compactedAt} compactionModel={compactionModel} />
        ) : null}
        {messages.length === 0 && !previousChat ? <EmptyState /> : null}
        {groups.map((group) => (
          <AnimatedMessageGroup key={getMessageGroupId(group)} animate={newGroupIds.has(getMessageGroupId(group))}>
            {renderMessageGroup({
              group,
              chatId,
              lastAssistantMessageId: getLastAssistantMessageId(messages),
              resolvedApprovalId,
              busy
            })}
          </AnimatedMessageGroup>
        ))}
        {busy || modelRequest?.phase === 'failed' ? (
          <AgentActivityStatus activity={activity} detail={activityDetail} modelRequest={modelRequest} />
        ) : null}
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

function PreviousChatHistory({ chat, compactedAt, compactionModel }: PreviousChatHistoryProps) {
  const groups = groupMessages(chat.messages, false);
  const label = formatCompactionDividerLabel(compactedAt, compactionModel);

  return (
    <>
      {groups.map((group) =>
        renderMessageGroup({
          group,
          chatId: chat.id,
          lastAssistantMessageId: getLastAssistantMessageId(chat.messages),
          busy: true
        })
      )}
      <div className={styles.compactionDivider}>
        <span className={styles.compactionLine} />
        <span className={styles.compactionLabel}>{label}</span>
        <span className={styles.compactionLine} />
      </div>
    </>
  );
}

function formatCompactionDividerLabel(compactedAt: number | undefined, compactionModel: string | undefined): string {
  return [
    'Context compacted',
    compactionModel ? `model: ${compactModelLabel(compactionModel)}` : undefined,
    compactedAt ? new Date(compactedAt).toLocaleString() : undefined
  ]
    .filter(Boolean)
    .join(' · ');
}

function compactModelLabel(model: string): string {
  return (
    model
      .replace(/^openrouter[:/]/i, '')
      .replace(/^codex[:/]/i, '')
      .trim() || model
  );
}

function renderMessageGroup(input: {
  group: MessageGroup;
  chatId: string;
  lastAssistantMessageId?: string;
  resolvedApprovalId?: string;
  busy: boolean;
}) {
  if (input.group.type === 'toolCalls') {
    return (
      <ToolCallsCut
        key={input.group.id}
        tools={input.group.tools}
        userMessage={input.group.userMessage}
        assistantMessage={input.group.assistantMessage}
        active={input.group.active}
        resolvedApprovalId={input.resolvedApprovalId}
      />
    );
  }

  return (
    <MessageCard
      message={input.group.message}
      defaultExpanded={isDefaultExpandedMessage(input.group.message, input.lastAssistantMessageId)}
      collapseToolId={input.resolvedApprovalId}
      actions={renderMessageActions({
        chatId: input.chatId,
        message: input.group.message,
        lastAssistantMessageId: input.lastAssistantMessageId,
        busy: input.busy
      })}
    />
  );
}

/**
 * Что это: собирает действия карточки сообщения.
 * Зачем нужно: после последнего ответа ассистента пользователь может вручную запустить анализ памяти, не открывая настройки.
 */
function renderMessageActions(input: {
  chatId: string;
  message: ChatMessage;
  lastAssistantMessageId?: string;
  busy: boolean;
}) {
  const canAnalyzeMemory =
    input.message.role === 'assistant' && input.message.id === input.lastAssistantMessageId && !input.busy;
  const canCopy = Boolean(input.message.content);

  if (!canCopy && !canAnalyzeMemory) {
    return null;
  }

  return (
    <div className={styles.messageActions}>
      {canAnalyzeMemory ? <AnalyzeMemoryButton chatId={input.chatId} disabled={input.busy} /> : null}
      {canCopy ? <CopyMessageButton markdown={input.message.content || ''} /> : null}
    </div>
  );
}
