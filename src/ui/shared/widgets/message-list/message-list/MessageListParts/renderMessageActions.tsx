import { AnalyzeMemoryButton, CopyMessageButton } from '../../../../features';
import { type ChatMessage } from '../../../../types';
import styles from '../MessageList.module.scss';

export function renderMessageActions(input: {
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
