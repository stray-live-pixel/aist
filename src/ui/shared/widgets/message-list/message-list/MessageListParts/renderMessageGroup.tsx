import { MessageCard, SubagentMessageCard } from '../../../../entities/message';
import { type AgentReflectionCandidate, type ChatMessage, type SubagentRun } from '../../../../types';
import { ToolCallsCut } from '../../tool-calls-cut';
import { type MessageGroup } from '../types';
import { isDefaultExpandedMessage } from '../utils';
import { renderMessageActions } from './renderMessageActions';

export function renderMessageGroup(input: {
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

  const actionsSignature = getMessageActionsSignature({
    message: input.group.message,
    lastAssistantMessageId: input.lastAssistantMessageId,
    busy: input.busy,
    memoryAnalysisRunning: input.memoryAnalysisRunning === true
  });

  return (
    <MessageCard
      message={input.group.message}
      authorLabel={input.group.message.role === 'assistant' ? input.assistantLabel : undefined}
      defaultExpanded={isDefaultExpandedMessage(input.group.message, input.lastAssistantMessageId)}
      collapseToolId={input.resolvedApprovalId}
      actionsSignature={actionsSignature}
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
 * Что это: компактная подпись набора действий карточки.
 * Зачем нужно: ReactNode кнопок создаётся заново при каждом render списка,
 * но старой карточке важно ререндериться только когда набор действий реально изменился.
 * Какую продуктовую проблему решает: большой чат не тратит CPU на повторный markdown-render старых сообщений.
 */
function getMessageActionsSignature(input: {
  message: ChatMessage;
  lastAssistantMessageId?: string;
  busy: boolean;
  memoryAnalysisRunning: boolean;
}): string {
  const canAnalyzeMemory =
    input.message.role === 'assistant' &&
    input.message.id === input.lastAssistantMessageId &&
    !input.busy &&
    !input.memoryAnalysisRunning;
  const canCopy = Boolean(input.message.content);

  return `${canCopy ? 'copy' : ''}:${canAnalyzeMemory ? 'memory' : ''}`;
}
