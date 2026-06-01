import styles from '../MessageList.module.scss';
import { type PreviousChatHistoryProps } from '../types';
import { getLastAssistantMessageId, groupMessages } from '../utils';
import { formatCompactionDividerLabel } from './formatCompactionDividerLabel';
import { renderMessageGroup } from './renderMessageGroup';

export function PreviousChatHistory({ chat, compactedAt, compactionModel }: PreviousChatHistoryProps) {
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
