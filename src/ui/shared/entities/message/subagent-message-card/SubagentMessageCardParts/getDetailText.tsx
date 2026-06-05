import { type ChatMessage, type SubagentRun } from '../../../../types';
import { formatModelLabel } from './formatModelLabel';

export function getDetailText(input: {
  message: ChatMessage;
  subagentRun?: SubagentRun;
  status: 'running' | 'success' | 'error';
}): string {
  const model = input.subagentRun?.model ? ` · модель: ${formatModelLabel(input.subagentRun.model)}` : '';
  if (input.status === 'running') {
    return `Субагент памяти анализирует чат${model}`;
  }

  return `${input.message.content || 'Анализ памяти завершён.'}${model}`;
}
