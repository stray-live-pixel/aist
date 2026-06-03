import { describe, expect, it } from 'vitest';

import type { Chat } from '../../shared/types/types';
import { buildRunReflectionPrompt, buildRunReflectionTrace, validateReflectionCandidates } from './reflection';

describe('post-run reflection trace', () => {
  it('builds a compact trace without raw tool output', () => {
    const chat = createChat([
      {
        role: 'user',
        content: 'Fix tests',
        createdAt: 100
      },
      {
        role: 'tool',
        name: 'run_bash_script',
        status: 'error',
        reason: 'Run focused tests with api_key=12345678901234567890',
        args: { script: 'npm run test -- reflection.test.ts' },
        result: {
          ok: false,
          stdout: 'very long raw output',
          stderr: 'secret-ish raw failure'
        },
        modelResult: {
          ok: false,
          exitCode: 1,
          error: 'Tests failed',
          stdoutChars: 20,
          stderrChars: 22
        },
        userApprovalComment: 'Use focused tests before the full suite.',
        createdAt: 120
      },
      {
        role: 'tool',
        name: 'write_file',
        status: 'done',
        reason: 'Update implementation',
        args: { path: 'src/core/reflection.ts', content: 'raw file content' },
        modelResult: { ok: true, path: 'src/core/reflection.ts' },
        createdAt: 130
      }
    ]);

    const trace = buildRunReflectionTrace({
      chat,
      runStartedAt: 100,
      task: 'Fix tests',
      outcome: { status: 'error', error: 'agent run failed: Tests failed' }
    });
    const serialized = JSON.stringify(trace);

    expect(trace.task).toBe('Fix tests');
    expect(trace.tools.map((tool) => tool.name)).toEqual(['run_bash_script', 'write_file']);
    expect(trace.errors).toContain('Tests failed');
    expect(trace.approvalFeedback).toEqual(['Use focused tests before the full suite.']);
    expect(trace.changedFiles).toEqual(['src/core/reflection.ts']);
    expect(serialized).not.toContain('very long raw output');
    expect(serialized).not.toContain('secret-ish raw failure');
    expect(serialized).not.toContain('raw file content');
    expect(serialized).not.toContain('12345678901234567890');
  });

  it('creates a reflection prompt with schema and trace JSON', () => {
    const prompt = buildRunReflectionPrompt({
      task: 'Update UI',
      outcome: 'success: completed',
      tools: [],
      reasons: [],
      errors: [],
      approvalFeedback: [],
      changedFiles: ['src/webview/app/App.tsx'],
      verification: ['npm run typecheck (exit 0)']
    });

    expect(prompt).toContain(
      '"kind": "memory_preference | project_lesson | verification_command | declarative_definition"'
    );
    expect(prompt).toContain('"changedFiles"');
    expect(prompt).toContain('npm run typecheck');
  });
});

describe('reflection candidate validation', () => {
  it('normalizes safe candidates and limits the inbox batch to three', () => {
    const candidates = validateReflectionCandidates(
      [
        {
          kind: 'memory_preference',
          title: 'Testing preference',
          content: 'Prefer focused tests before the full suite.',
          reason: 'The user asked for focused tests.'
        },
        {
          kind: 'project_lesson',
          title: 'State sync',
          content: 'When changing webview IPC contracts, update extension and webview types together.',
          scope: 'project'
        },
        {
          kind: 'verification_command',
          title: 'Typecheck',
          content: 'npm run typecheck',
          scope: 'project'
        },
        {
          kind: 'declarative_definition',
          title: 'Extra',
          content: 'A fourth candidate is ignored.'
        }
      ],
      123
    );

    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      kind: 'memory_preference',
      scope: 'global',
      status: 'pending',
      createdAt: 123
    });
    expect(candidates[2]?.content).toBe('npm run typecheck');
  });

  it('rejects unsafe candidates and duplicates', () => {
    const candidates = validateReflectionCandidates(
      [
        {
          kind: 'project_lesson',
          title: 'Raw output',
          content: 'stdout: full command output should not be saved'
        },
        {
          kind: 'memory_preference',
          title: 'Secret',
          content: 'api_key=sk-test-secret-value'
        },
        {
          kind: 'project_lesson',
          title: 'Valid',
          content: 'Use compact trace summaries for post-run reflection.'
        },
        {
          kind: 'project_lesson',
          title: 'Valid copy',
          content: 'Use compact trace summaries for post-run reflection.'
        }
      ],
      456
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.title).toBe('Valid');
  });
});

function createChat(messages: Array<Partial<Chat['messages'][number]>>): Chat {
  return {
    id: 'chat-1',
    title: 'Chat',
    model: 'test-model',
    modelSettings: createModelSettings('test-model'),
    messages: messages.map((message, index) => ({
      id: `message-${index}`,
      role: 'assistant',
      createdAt: 0,
      ...message
    })),
    history: [],
    lastAnswer: '',
    busy: false,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    createdAt: 0,
    updatedAt: 0
  };
}

function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false,
    toolsDisabled: false
  };
}
