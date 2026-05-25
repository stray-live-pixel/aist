/**
 * Что это: область истории сообщений чата.
 * Зачем нужно: держит прокрутку истории и добавляет служебные элементы в начало чата.
 * Пример использования: <MessageList messages={messages} tools={tools} activeMode={mode} busy={busy} />.
 */
import { useLayoutEffect, useRef } from 'react';

import { MessageCard } from '../../../entities/message/MessageCard';
import { CopyMessageButton } from '../../../features/copy-message/CopyMessageButton';
import { AgentActivityStatus } from '../agent-activity-status';
import { EmptyState } from '../empty-state';
import { SystemInstructionLabel } from '../system-instruction-label';
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
  activeMode,
  instructionSources,
  promptConfig,
  busy,
  activity,
  activityDetail,
  bottomOffset = 'none',
  resolvedApprovalId
}: MessageListProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);
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
      className={`${styles.root} ${bottomOffset === 'composer' ? styles.withComposerOffset : ''}`}
      onScroll={handleScroll}
    >
      <div className={styles.stickyInstructions}>
        <SystemInstructionLabel
          mode={activeMode}
          sources={instructionSources}
          promptConfig={promptConfig}
          busy={busy}
        />
      </div>
      <div className={styles.stack}>
        {previousChat ? <PreviousChatHistory chat={previousChat} compactedAt={compactedAt} /> : null}
        {messages.length === 0 && !previousChat ? <EmptyState /> : null}
        {groups.map((group) => renderMessageGroup(group, getLastAssistantMessageId(messages), resolvedApprovalId))}
        {busy ? <AgentActivityStatus activity={activity} detail={activityDetail} /> : null}
      </div>
    </main>
  );
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
      key={group.message.id}
      message={group.message}
      defaultExpanded={isDefaultExpandedMessage(group.message, lastAssistantMessageId)}
      collapseToolId={resolvedApprovalId}
      actions={group.message.content ? <CopyMessageButton markdown={group.message.content} /> : null}
    />
  );
}
