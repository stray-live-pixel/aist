import { type ChatMessage, type SubagentRun } from '../../../../shared/types';

export function getMessageStatus(input: {
  message: ChatMessage;
  subagentRun?: SubagentRun;
}): 'running' | 'success' | 'error' {
  if (input.subagentRun?.status === 'error' || input.message.status === 'error') {
    return 'error';
  }

  if (input.subagentRun?.status === 'running' || input.message.status === 'running') {
    return 'running';
  }

  return 'success';
}
