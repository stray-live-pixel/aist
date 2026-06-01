/**
 * Что это: область истории сообщений чата.
 * Зачем нужно: держит прокрутку истории и добавляет служебные элементы в начало чата.
 * Пример использования: <MessageList messages={messages} tools={tools} activeMode={mode} busy={busy} />.
 */
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { MessageCard, SubagentMessageCard } from '../../../entities/message';
import { AnalyzeMemoryButton, CopyMessageButton } from '../../../features';
import type { AgentReflectionCandidate, ChatMessage, SubagentRun } from '../../../shared/types';
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
  assistantLabel,
  busy,
  activity,
  activityDetail,
  modelRequest,
  subagentRuns = [],
  memoryReflectionCandidates = [],
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
  const [selectedSubagentRunId, setSelectedSubagentRunId] = useState<string | undefined>();
  const pendingMemoryCandidates = useMemo(
    () => memoryReflectionCandidates.filter((candidate) => candidate.status === 'pending'),
    [memoryReflectionCandidates]
  );
  const memoryAnalysisRunning = subagentRuns.some((run) => run.kind === 'memory.analysis' && run.status === 'running');

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
              assistantLabel,
              lastAssistantMessageId: getLastAssistantMessageId(messages),
              resolvedApprovalId,
              busy,
              memoryAnalysisRunning,
              subagentRuns,
              memoryReflectionCandidates: pendingMemoryCandidates,
              onOpenSubagent: setSelectedSubagentRunId
            })}
          </AnimatedMessageGroup>
        ))}
        {busy || modelRequest?.phase === 'failed' ? (
          <AgentActivityStatus activity={activity} detail={activityDetail} modelRequest={modelRequest} />
        ) : null}
      </div>
      {selectedSubagentRunId ? (
        <SubagentDetailsModal
          run={subagentRuns.find((run) => run.id === selectedSubagentRunId)}
          onClose={() => setSelectedSubagentRunId(undefined)}
        />
      ) : null}
    </main>
  );
}

function AnimatedMessageGroup({ children, animate }: { children: ReactNode; animate: boolean }) {
  return <div className={animate ? styles.messageEnter : styles.messageItem}>{children}</div>;
}

/**
 * Что это: modal с полной persisted историей субагента.
 * Зачем нужно: пользователь может открыть детали дочернего запуска, не загрязняя основной чат техническими prompt messages.
 */
function SubagentDetailsModal({ run, onClose }: { run?: SubagentRun; onClose(): void }) {
  if (!run) {
    return null;
  }

  return (
    <div className={styles.subagentModalBackdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.subagentModal}
        role="dialog"
        aria-modal="true"
        aria-label="Детали субагента"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.subagentModalHeader}>
          <div>
            <strong>{run.title}</strong>
            <span>
              {run.kind} · {run.mode} · {run.model}
            </span>
          </div>
          <button
            type="button"
            className={styles.subagentModalClose}
            onClick={onClose}
            aria-label="Закрыть детали субагента"
          >
            ×
          </button>
        </div>
        <div className={styles.subagentModalMeta}>
          <span>Статус: {run.status}</span>
          <span>Parent chat: {run.parentChatId}</span>
          <span>Старт: {new Date(run.startedAt).toLocaleString()}</span>
          {run.finishedAt ? <span>Финиш: {new Date(run.finishedAt).toLocaleString()}</span> : null}
          {run.error ? <span className={styles.subagentModalError}>Ошибка: {run.error}</span> : null}
        </div>
        <div className={styles.subagentModalMessages}>
          {run.messages.map((message) => (
            <MessageCard key={message.id} message={message} defaultExpanded />
          ))}
        </div>
      </section>
    </div>
  );
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
          busy: true,
          subagentRuns: [],
          memoryReflectionCandidates: [],
          onOpenSubagent: () => undefined
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
  assistantLabel?: string;
  lastAssistantMessageId?: string;
  resolvedApprovalId?: string;
  busy: boolean;
  memoryAnalysisRunning?: boolean;
  subagentRuns: SubagentRun[];
  memoryReflectionCandidates: AgentReflectionCandidate[];
  onOpenSubagent(runId: string): void;
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

  if (input.group.message.role === 'subagent') {
    const runId = input.group.message.subagentRunId || input.group.message.subagent?.runId;
    return (
      <SubagentMessageCard
        chatId={input.chatId}
        message={input.group.message}
        subagentRun={input.subagentRuns.find((run) => run.id === runId)}
        candidates={input.memoryReflectionCandidates}
        onOpenSubagent={input.onOpenSubagent}
      />
    );
  }

  return (
    <MessageCard
      message={input.group.message}
      authorLabel={input.group.message.role === 'assistant' ? input.assistantLabel : undefined}
      defaultExpanded={isDefaultExpandedMessage(input.group.message, input.lastAssistantMessageId)}
      collapseToolId={input.resolvedApprovalId}
      actions={renderMessageActions({
        chatId: input.chatId,
        message: input.group.message,
        lastAssistantMessageId: input.lastAssistantMessageId,
        busy: input.busy,
        memoryAnalysisRunning: input.memoryAnalysisRunning === true
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
  memoryAnalysisRunning: boolean;
}) {
  const canAnalyzeMemory =
    input.message.role === 'assistant' &&
    input.message.id === input.lastAssistantMessageId &&
    !input.busy &&
    !input.memoryAnalysisRunning;
  const canCopy = Boolean(input.message.content);

  if (!canCopy && !canAnalyzeMemory) {
    return null;
  }

  return (
    <div className={styles.messageActions}>
      {canAnalyzeMemory ? (
        <AnalyzeMemoryButton chatId={input.chatId} disabled={input.busy || input.memoryAnalysisRunning} />
      ) : null}
      {canCopy ? <CopyMessageButton markdown={input.message.content || ''} /> : null}
    </div>
  );
}
