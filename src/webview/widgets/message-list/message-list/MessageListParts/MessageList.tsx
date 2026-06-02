import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { ActivePlanWidget } from '../../active-plan';
import { AgentActivityStatus } from '../../agent-activity-status';
import { EmptyState } from '../../empty-state';
import styles from '../MessageList.module.scss';
import { type MessageListProps } from '../types';
import { getLastAssistantMessageId, groupMessages, isNearBottom, scrollToBottom } from '../utils';
import { AnimatedMessageGroup } from './AnimatedMessageGroup';
import { PreviousChatHistory } from './PreviousChatHistory';
import { SubagentDetailsModal } from './SubagentDetailsModal';
import { getMessageGroupId } from './getMessageGroupId';
import { getMessageGroupIdsSignature } from './getMessageGroupIdsSignature';
import { renderMessageGroup } from './renderMessageGroup';

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
  const groupIdsSignature = getMessageGroupIdsSignature({ groupIds });
  const [newGroupIds, setNewGroupIds] = useState<Set<string>>(new Set());
  const [selectedSubagentRunId, setSelectedSubagentRunId] = useState<string | undefined>();
  const pendingMemoryCandidates = useMemo(
    () => memoryReflectionCandidates.filter((candidate) => candidate.status === 'pending'),
    [memoryReflectionCandidates]
  );
  const memoryAnalysisRunning = subagentRuns.some((run) => run.kind === 'memory.analysis' && run.status === 'running');

  useLayoutEffect(() => {
    const previousGroupIds = previousGroupIdsRef.current;
    const nextNewGroupIds = hasRenderedRef.current
      ? new Set(groupIds.filter((groupId) => !previousGroupIds.has(groupId)))
      : new Set<string>();

    // Обновляем анимационное состояние только при реальном изменении состава групп,
    // иначе пустой чат зацикливает React и webview перестаёт показывать историю.
    setNewGroupIds(nextNewGroupIds);
    previousGroupIdsRef.current = new Set(groupIds);
    hasRenderedRef.current = true;

    if (!shouldStickToBottomRef.current) {
      return;
    }

    scrollToBottom(scrollRef.current);
  }, [groupIdsSignature]);

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
