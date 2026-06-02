import { type Chat } from '../../../shared/types/types';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { MAX_TASK_CHARS } from './MAX_TASK_CHARS';
import { MAX_TRACE_ITEMS } from './MAX_TRACE_ITEMS';
import { RunReflectionOutcome } from './RunReflectionOutcome';
import { RunReflectionTrace } from './RunReflectionTrace';
import { collectErrors } from './collectErrors';
import { formatOutcome } from './formatOutcome';
import { getChangedFiles } from './getChangedFiles';
import { getVerificationCommands } from './getVerificationCommands';
import { toTraceTool } from './toTraceTool';
import { truncateForReflection } from './truncateForReflection';
import { uniqueLimited } from './uniqueLimited';

export function buildRunReflectionTrace(input: {
  chat: Chat;
  runStartedAt: number;
  task: string;
  outcome: RunReflectionOutcome;
}): RunReflectionTrace {
  const runMessages = input.chat.messages.filter((message) => message.createdAt >= input.runStartedAt);
  const toolMessages = runMessages.filter((message) => message.role === 'tool');
  const errors = collectErrors(runMessages, input.outcome);

  return {
    task: truncateForReflection(input.task, MAX_TASK_CHARS),
    outcome: formatOutcome(input.outcome),
    tools: toolMessages.slice(-MAX_TRACE_ITEMS).map(toTraceTool),
    reasons: uniqueLimited(
      toolMessages.map((message) => truncateForReflection(message.reason || '', MAX_FIELD_CHARS)).filter(Boolean)
    ),
    errors,
    approvalFeedback: uniqueLimited(
      toolMessages
        .map((message) => truncateForReflection(message.userApprovalComment || '', MAX_FIELD_CHARS))
        .filter(Boolean)
    ),
    changedFiles: uniqueLimited(toolMessages.flatMap(getChangedFiles)),
    verification: uniqueLimited(toolMessages.flatMap(getVerificationCommands))
  };
}
