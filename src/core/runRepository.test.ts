import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { RunRepository } from './runRepository';
import { workspaceRunsDir } from './storage';
import type { RuntimeToolCallSnapshot } from './types';

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('RunRepository', () => {
  it('creates, lists, updates, appends logs and restores runs after restart', async () => {
    const workspaceRoot = createWorkspaceRoot();
    let now = 1000;
    const repository = new RunRepository({
      workspaceRoot,
      idFactory: createIdFactory(['run-1', 'approval-log-1', 'tool-result-log-1']),
      now: () => now
    });
    const toolCall: RuntimeToolCallSnapshot = {
      id: 'call-1',
      name: 'run_bash_script',
      args: { command: 'npm test' },
      reason: 'Verify changes'
    };

    const run = await repository.create({
      chatId: 'chat-1',
      prompt: 'Run tests',
      model: 'model-a'
    });
    expect(run).toMatchObject({ id: 'run-1', chatId: 'chat-1', status: 'running' });

    now = 1100;
    await repository.appendEvent(run.id, {
      type: 'run.started',
      run: {
        id: run.id,
        chatId: 'chat-1',
        status: 'running',
        prompt: 'Run tests',
        startedAt: 1000,
        model: 'model-a'
      },
      at: 1100
    });
    now = 1200;
    await repository.appendApproval(run.id, {
      chatId: 'chat-1',
      approvalId: 'approval-1',
      messageId: 'message-1',
      status: 'requested',
      toolCall
    });
    now = 1300;
    await repository.appendToolResult(run.id, {
      chatId: 'chat-1',
      messageId: 'message-1',
      toolCall,
      result: { ok: true, stdout: 'x'.repeat(8000) },
      modelResult: { ok: true, stdoutPreview: 'compact output' }
    });
    now = 1400;
    await repository.setTelemetry(run.id, {
      totalTokens: 5,
      approvals: { requested: 1, approved: 1, denied: 0 }
    });
    now = 1500;
    await repository.appendEvent(run.id, {
      type: 'run.completed',
      run: {
        id: run.id,
        chatId: 'chat-1',
        status: 'completed',
        startedAt: 1000,
        finishedAt: 1500,
        model: 'model-a',
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
      },
      answer: 'Done',
      usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
      at: 1500
    });

    const runs = await repository.list();
    expect(runs).toEqual([
      expect.objectContaining({
        id: 'run-1',
        chatId: 'chat-1',
        status: 'completed',
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
      })
    ]);

    const runRoot = path.join(workspaceRunsDir(workspaceRoot), run.id);
    expectJsonFile(path.join(runRoot, 'meta.json'));
    expectJsonFile(path.join(runRoot, 'telemetry.json'));
    expectJsonlFile(path.join(runRoot, 'events.jsonl'), 2);
    expectJsonlFile(path.join(runRoot, 'approvals.jsonl'), 1);
    expectJsonlFile(path.join(runRoot, 'tool-results.jsonl'), 1);

    const restarted = new RunRepository({ workspaceRoot });
    const restored = await restarted.get(run.id);
    expect(restored?.meta).toMatchObject({
      id: 'run-1',
      chatId: 'chat-1',
      status: 'completed',
      finishedAt: 1500
    });
    expect(restored?.events.map((event) => event.type)).toEqual(['run.started', 'run.completed']);
    expect(restored?.approvals[0]).toMatchObject({ id: 'approval-log-1', approvalId: 'approval-1' });
    expect(restored?.toolResults[0]).toMatchObject({
      id: 'tool-result-log-1',
      result: { ok: true, stdout: 'x'.repeat(8000) },
      modelResult: { ok: true, stdoutPreview: 'compact output' }
    });
    expect(restored?.telemetry).toEqual({
      totalTokens: 5,
      approvals: { requested: 1, approved: 1, denied: 0 }
    });
  });

  it('updates run metadata atomically without rewriting append-only logs', async () => {
    const workspaceRoot = createWorkspaceRoot();
    let now = 2000;
    const repository = new RunRepository({
      workspaceRoot,
      idFactory: createIdFactory(['run-2']),
      now: () => now
    });
    const run = await repository.create({ chatId: 'chat-2', prompt: 'Stop', model: 'model-b' });
    await repository.appendEvent(run.id, {
      type: 'run.stopped',
      runId: run.id,
      chatId: 'chat-2',
      reason: 'User requested stop',
      at: 2100
    });
    const eventsPath = path.join(workspaceRunsDir(workspaceRoot), run.id, 'events.jsonl');
    const beforeUpdate = fs.readFileSync(eventsPath, 'utf8');

    now = 2200;
    await repository.update(run.id, { status: 'failed', error: { message: 'Manual override' } });

    expect(fs.readFileSync(eventsPath, 'utf8')).toBe(beforeUpdate);
    expect(await repository.get(run.id)).toMatchObject({
      meta: {
        id: 'run-2',
        status: 'failed',
        error: { message: 'Manual override' },
        updatedAt: 2200
      }
    });
  });
});

function createWorkspaceRoot(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-run-repository-'));
  tempDirs.push(tempDir);
  return path.join(tempDir, 'workspace');
}

function createIdFactory(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] || `generated-${index}`;
}

function expectJsonFile(filePath: string): void {
  expect(() => JSON.parse(fs.readFileSync(filePath, 'utf8'))).not.toThrow();
}

function expectJsonlFile(filePath: string, expectedLines: number): void {
  const lines = fs.readFileSync(filePath, 'utf8').trimEnd().split('\n');
  expect(lines).toHaveLength(expectedLines);
  for (const line of lines) {
    expect(() => JSON.parse(line)).not.toThrow();
  }
}
