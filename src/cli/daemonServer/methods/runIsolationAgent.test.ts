import { describe, expect, it } from 'vitest';

import type { IsolationAgentRunInput } from '../isolation/IsolationSessionManager';
import { buildIsolationSystemPrompt } from './runIsolationAgentParts/buildIsolationSystemPrompt';

/**
 * Что это: минимальный вход для isolated prompt без запуска Docker и daemon.
 * Зачем нужно: тест проверяет продуктовые правила isolated PR отдельно от тяжёлого runtime.
 * Какую продуктовую проблему решает: регрессии в инструкциях не превращают isolated agents в большие трудные для review PR.
 */
function createIsolationPromptInput(): IsolationAgentRunInput {
  return {
    session: {
      sessionId: 'session-1',
      taskId: 'task-1',
      prompt: 'Implement a focused change.',
      branchName: 'aist/task/test',
      provider: 'docker-local',
      status: 'running_agent',
      attempt: 1,
      createdAt: 1,
      updatedAt: 1
    },
    worktreePath: '/tmp/aist-worktree',
    containerName: 'aist-container',
    dockerProvider: {} as IsolationAgentRunInput['dockerProvider']
  };
}

describe('buildIsolationSystemPrompt', () => {
  it('requires small complete PRs and decomposes complex isolated tasks', () => {
    const prompt = buildIsolationSystemPrompt(createIsolationPromptInput());

    expect(prompt).toContain('Keep every isolated-agent PR small, simple, and complete');
    expect(prompt).toContain('decompose it into simple finished subtasks');
    expect(prompt).toContain('execute the decomposed subtasks iteratively in a loop');
    expect(prompt).toContain('commit it, mark it done, and only then move to the next subtask');
    expect(prompt).toContain('Prefer parallel isolated-agent PRs when independent subtasks');
    expect(prompt).toContain('separate checkpoint commits in this run');
  });
});
