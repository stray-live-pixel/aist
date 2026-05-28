import type { ChatMessage, OpenRouterMessage } from './types';

export const COMPACTION_SYSTEM_PROMPT = [
  'You summarize coding-agent chat history for context compaction.',
  'Create a dense handoff summary that will be used as the first message in a new chat.',
  'Return Markdown with exactly these headings in this order: Goal, Status, Constraints, Decisions, Files changed, Commands run, Open tasks, Errors/blockers.',
  'Use "None known" for empty sections. Preserve important user goals, decisions, constraints, files changed, commands run, current status, open tasks, and errors.',
  'Do not include irrelevant chatter. Be concise but complete. Write in the same language as the conversation.'
].join(' ');

export type CompactionHistorySplit = {
  summaryHistory: OpenRouterMessage[];
  tailHistory: OpenRouterMessage[];
};

export function splitCompactionHistory(history: OpenRouterMessage[], keepLastMessages: number): CompactionHistorySplit {
  return splitTail(history, keepLastMessages, 'summaryHistory', 'tailHistory');
}

export function selectCompactionTailMessages(messages: ChatMessage[], keepLastMessages: number): ChatMessage[] {
  return splitTail(messages, keepLastMessages, 'head', 'tail').tail;
}

export function createCompactionMessages(history: OpenRouterMessage[]): OpenRouterMessage[] {
  const serialized = history
    .filter((message) => message.role !== 'system')
    .map((message, index) => {
      const toolCalls = message.tool_calls?.length ? `\nTool calls: ${JSON.stringify(message.tool_calls)}` : '';
      const toolId = message.tool_call_id ? `\nTool call id: ${message.tool_call_id}` : '';
      return `#${index + 1} ${message.role}\n${message.content || ''}${toolCalls}${toolId}`;
    })
    .join('\n\n---\n\n');

  return [
    { role: 'system', content: COMPACTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Summarize this earlier chat history for context compaction. The next chat will receive your summary followed by any preserved recent messages, not the full original history.\n\n${serialized}`
    }
  ];
}

function splitTail<T, HeadKey extends string, TailKey extends string>(
  items: T[],
  keepLastMessages: number,
  headKey: HeadKey,
  tailKey: TailKey
): Record<HeadKey, T[]> & Record<TailKey, T[]> {
  const keepCount = normalizeKeepLastMessages(keepLastMessages);
  const tailStart = keepCount > 0 ? Math.max(0, items.length - keepCount) : items.length;

  return {
    [headKey]: items.slice(0, tailStart),
    [tailKey]: items.slice(tailStart)
  } as Record<HeadKey, T[]> & Record<TailKey, T[]>;
}

function normalizeKeepLastMessages(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
