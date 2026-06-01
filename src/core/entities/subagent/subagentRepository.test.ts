import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../../shared/types/types';
import { globalWorkspaceSubagentsDir } from '../storage/storage';
import { SubagentRepository } from './subagentRepository';

/**
 * Что это: создаёт isolated temp workspace для файловых тестов repository.
 * Зачем нужно: тесты не читают пользовательские чаты и проверяют только контракт хранения субагентов.
 */
async function createTempWorkspace(): Promise<{ workspaceRoot: string; homeDir: string; cleanup(): Promise<void> }> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aist-subagents-'));
  const workspaceRoot = path.join(root, 'workspace');
  const homeDir = path.join(root, 'home');
  await fs.promises.mkdir(workspaceRoot, { recursive: true });
  await fs.promises.mkdir(homeDir, { recursive: true });

  return {
    workspaceRoot,
    homeDir,
    cleanup: () => fs.promises.rm(root, { recursive: true, force: true })
  };
}

describe('SubagentRepository', () => {
  it('creates and gets a persisted subagent run', async () => {
    const temp = await createTempWorkspace();
    try {
      const repository = new SubagentRepository({
        workspaceRoot: temp.workspaceRoot,
        homeDir: temp.homeDir,
        idFactory: () => 'run-1',
        now: () => 100
      });

      const run = await repository.create({
        parentChatId: 'chat-1',
        kind: 'memory.analysis',
        mode: 'single_model_call',
        title: 'Субагент памяти',
        status: 'running',
        model: 'memory-model',
        includeResultInParentModelContext: false
      });

      expect(run.id).toBe('run-1');
      expect(run.parentChatId).toBe('chat-1');
      expect(run.status).toBe('running');
      expect(run.startedAt).toBe(100);
      expect(await repository.get('run-1')).toEqual(run);
      await expect(
        fs.promises.access(
          path.join(globalWorkspaceSubagentsDir(temp.workspaceRoot, temp.homeDir), 'chat-1', 'run-1.json')
        )
      ).resolves.toBeUndefined();
    } finally {
      await temp.cleanup();
    }
  });

  it('updates status and persists messages, history and result', async () => {
    const temp = await createTempWorkspace();
    try {
      let clock = 100;
      const repository = new SubagentRepository({
        workspaceRoot: temp.workspaceRoot,
        homeDir: temp.homeDir,
        idFactory: () => 'run-1',
        now: () => clock
      });
      await repository.create({
        parentChatId: 'chat-1',
        kind: 'memory.analysis',
        mode: 'single_model_call',
        title: 'Субагент памяти',
        status: 'running',
        model: 'memory-model',
        includeResultInParentModelContext: false
      });

      const messages: ChatMessage[] = [{ id: 'message-1', role: 'assistant', content: 'Готово', createdAt: 120 }];
      clock = 200;
      const updated = await repository.update('run-1', {
        status: 'success',
        messages,
        history: [{ role: 'assistant', content: '{"candidates":[]}' }],
        result: { candidateIds: [] },
        finishedAt: 180
      });

      expect(updated.status).toBe('success');
      expect(updated.messages).toEqual(messages);
      expect(updated.history).toEqual([{ role: 'assistant', content: '{"candidates":[]}' }]);
      expect(updated.result).toEqual({ candidateIds: [] });
      expect(updated.finishedAt).toBe(180);
      expect(updated.updatedAt).toBe(200);
      expect(await repository.get('run-1')).toEqual(updated);
    } finally {
      await temp.cleanup();
    }
  });

  it('lists runs by parent chat sorted by update time', async () => {
    const temp = await createTempWorkspace();
    try {
      let nextId = 1;
      let clock = 100;
      const repository = new SubagentRepository({
        workspaceRoot: temp.workspaceRoot,
        homeDir: temp.homeDir,
        idFactory: () => `run-${nextId++}`,
        now: () => clock
      });

      await repository.create({
        parentChatId: 'chat-1',
        kind: 'memory.analysis',
        mode: 'single_model_call',
        title: 'Первый',
        model: 'memory-model',
        includeResultInParentModelContext: false
      });
      clock = 300;
      await repository.create({
        parentChatId: 'chat-1',
        kind: 'memory.analysis',
        mode: 'single_model_call',
        title: 'Второй',
        model: 'memory-model',
        includeResultInParentModelContext: false
      });
      await repository.create({
        parentChatId: 'chat-2',
        kind: 'memory.analysis',
        mode: 'single_model_call',
        title: 'Другой чат',
        model: 'memory-model',
        includeResultInParentModelContext: false
      });

      const runs = await repository.list('chat-1');
      expect(runs.map((run) => run.id)).toEqual(['run-2', 'run-1']);
    } finally {
      await temp.cleanup();
    }
  });
});
