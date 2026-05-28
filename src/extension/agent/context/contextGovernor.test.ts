import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage } from '../../../core/types';
import { classifyContextTask, governModelContext } from './contextGovernor';
import type { EditorContextInput } from './editorContextBuilder';

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
  it('omits full active file content by default for read-only tasks', () => {
    const result = governModelContext({
      prompt: 'Explain what closures are',
      history: [],
      editorContext: baseEditorContext
    });

    expect(result.taskType).toBe('read-only');
    expect(result.editorContextBlock).toContain('File: /workspace/src/example.ts');
    expect(result.editorContextBlock).toContain('Language: typescript');
    expect(result.editorContextBlock).not.toContain('const irrelevant');
    expect(result.userContent).toContain('Context note:');
    expect(result.contextNote).toContain('Omitted full active file content');
  });

  it('prioritizes selected code for edit tasks in auto mode', () => {
    const result = governModelContext({
      prompt: 'Refactor this selected code',
      history: [],
      editorContext: {
        ...baseEditorContext,
        selectionText: 'console.log(irrelevant);'
      }
    });

    expect(result.taskType).toBe('code-edit');
    expect(result.editorContextBlock).toContain('Selected code:\nconsole.log(irrelevant);');
    expect(result.editorContextBlock).not.toContain('const irrelevant = true;');
    expect(result.contextNote).toContain('Included active selection');
  });

  it('includes budgeted active file content for explicit file mode', () => {
    const result = governModelContext({
      prompt: 'Fix current file',
      history: [],
      editorContext: {
        ...baseEditorContext,
        mode: 'file',
        maxChars: 8
      },
      budgets: {
        editorContextChars: 8
      }
    });

    expect(result.taskType).toBe('code-edit');
    expect(result.editorContextBlock).toContain('File content:\nconst ir\n...<truncated>');
  });

  it('limits history tail and includes recent tool summaries', () => {
    const history: OpenRouterMessage[] = [
      { role: 'user', content: 'old prompt that should be omitted' },
      { role: 'assistant', content: 'old answer that should be omitted' },
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
    expect(result.keptHistoryMessages).toBe(2);
    expect(result.omittedHistoryMessages).toBe(3);
    expect(result.messages.map((message) => message.content)).not.toContain('old prompt that should be omitted');
    expect(result.recentToolSummaries[0]).toContain('call-1');
    expect(result.userContent).toContain('Recent tool summaries:');
  });
});
