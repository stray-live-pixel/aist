import { describe, expect, it } from 'vitest';

import {
  COMPACTION_SYSTEM_PROMPT,
  createCompactionMessages,
  selectCompactionTailMessages,
  splitCompactionHistory
} from './compaction';

describe('compaction helpers', () => {
  it('keeps no tail when keepLastMessages is 0', () => {
    const history = [
      { role: 'user' as const, content: 'Goal: update parser.' },
      { role: 'assistant' as const, content: 'Parser updated.' }
    ];

    const split = splitCompactionHistory(history, 0);

    expect(split.summaryHistory).toEqual(history);
    expect(split.tailHistory).toEqual([]);
  });

  it('removes the last message from summary input and preserves it as tail when keepLastMessages is 1', () => {
    const history = [
      { role: 'user' as const, content: 'First request.' },
      { role: 'assistant' as const, content: 'First answer.' },
      { role: 'user' as const, content: 'Fresh follow-up.' }
    ];

    const split = splitCompactionHistory(history, 1);
    const prompt = createCompactionMessages(split.summaryHistory);

    expect(split.summaryHistory.map((message) => message.content)).toEqual(['First request.', 'First answer.']);
    expect(split.tailHistory.map((message) => message.content)).toEqual(['Fresh follow-up.']);
    expect(prompt[1]?.content).toContain('First request.');
    expect(prompt[1]?.content).not.toContain('Fresh follow-up.');
  });

  it('keeps all messages as tail when keepLastMessages exceeds history length', () => {
    const history = [
      { role: 'user' as const, content: 'Only request.' },
      { role: 'assistant' as const, content: 'Only answer.' }
    ];
    const messages = history.map((message, index) => ({
      id: `message-${index}`,
      role: message.role,
      content: message.content,
      createdAt: index + 1
    }));

    const split = splitCompactionHistory(history, 10);
    const tailMessages = selectCompactionTailMessages(messages, 10);
    const prompt = createCompactionMessages(split.summaryHistory);

    expect(split.summaryHistory).toEqual([]);
    expect(split.tailHistory).toEqual(history);
    expect(tailMessages.map((message) => message.content)).toEqual(['Only request.', 'Only answer.']);
    expect(prompt[1]?.content).not.toContain('Only request.');
  });

  it('requests the structured handoff sections in the compaction prompt', () => {
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Goal');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Status');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Constraints');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Decisions');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Files changed');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Commands run');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Open tasks');
    expect(COMPACTION_SYSTEM_PROMPT).toContain('Errors/blockers');
  });
});
