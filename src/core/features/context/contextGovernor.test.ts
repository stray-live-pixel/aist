import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage } from '../../shared/types/types';
import { type EditorContextInput, classifyContextTask, governModelContext } from './contextGovernor';

const baseEditorContext: EditorContextInput = {
  fileName: '/workspace/src/example.ts',
  languageId: 'typescript',
  selectionText: '',
  fullText: 'const irrelevant = true;\nconsole.log(irrelevant);',
  maxChars: 12000,
  mode: 'auto'
};

describe('classifyContextTask', () => {
  it('classifies main MVP task types', () => {
    expect(classifyContextTask('Explain what this function does')).toBe('read-only');
    expect(classifyContextTask('Implement validation for this command')).toBe('code-edit');
    expect(classifyContextTask('Fix the failing vitest run')).toBe('debug-test-fix');
    expect(classifyContextTask('Find where the auth flow is implemented in the repo')).toBe('repo-inspection');
  });
});

describe('governModelContext', () => {
  it('passes through full history and appends the current prompt', () => {
    const history: OpenRouterMessage[] = [
      { role: 'user', content: 'old prompt that should be preserved' },
      { role: 'assistant', content: 'old answer that should be preserved' },
      { role: 'tool', tool_call_id: 'call-1', content: JSON.stringify({ ok: true, path: 'src/old.ts' }) },
      { role: 'user', content: 'recent prompt' },
      { role: 'assistant', content: 'recent answer' }
    ];

    const result = governModelContext({
      prompt: 'Find the command implementation',
      history,
      editorContext: baseEditorContext,
      budgets: {
        historyTailMessages: 2,
        historyTailChars: 1000,
        recentToolSummaries: 1
      }
    });

    expect(result.taskType).toBe('repo-inspection');
    expect(result.messages).toEqual([...history, { role: 'user', content: 'Find the command implementation' }]);
    expect(result.keptHistoryMessages).toBe(history.length);
    expect(result.omittedHistoryMessages).toBe(0);
  });

  it('does not inject governed context blocks into the new user message', () => {
    const result = governModelContext({
      prompt: 'Fix current file',
      history: [],
      editorContext: {
        ...baseEditorContext,
        mode: 'file',
        maxChars: 8
      },
      repoContextNote: 'Repository note should not be injected.',
      memoryContextBlock: 'Memory should not be injected.',
      budgets: {
        editorContextChars: 8
      }
    });

    expect(result.taskType).toBe('code-edit');
    expect(result.userContent).toBe('Fix current file');
    expect(result.contextNote).toBe('');
    expect(result.editorContextBlock).toBe('');
    expect(result.recentToolSummaries).toEqual([]);
  });
});
