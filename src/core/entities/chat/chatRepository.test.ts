import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../storage/storage';
import { ChatRepository } from './chatRepository';

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('ChatRepository', () => {
  it('creates, lists, updates, appends and restores chats after restart', async () => {
    const workspaceRoot = createWorkspaceRoot();
    let now = 1000;
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-1', 'message-1', 'message-2']),
      now: () => now
    });

    const chat = await repository.create({ model: 'model-a' });
    expect(chat).toMatchObject({ id: 'chat-1', title: 'New chat', model: 'model-a', busy: false });

    now = 1100;
    const userMessage = await repository.appendMessage(chat.id, {
      role: 'user',
      content: 'Hello\nworkspace'
    });
    now = 1200;
    await repository.appendMessage(chat.id, {
      role: 'assistant',
      content: 'Hi there.'
    });
    now = 1300;
    await repository.appendHistory(chat.id, { role: 'user', content: 'Hello workspace' });
    now = 1400;
    await repository.update(chat.id, {
      title: 'Manual title',
      lastAnswer: 'Hi there.',
      usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
    });
    now = 1500;
    await repository.updateState(chat.id, {
      busy: true,
      activity: 'thinking',
      activePlan: {
        title: 'Plan',
        items: [{ id: 'step-1', text: 'Read files', status: 'in_progress' }]
      }
    });

    const summaries = await repository.list();
    expect(summaries).toEqual([
      expect.objectContaining({
        id: 'chat-1',
        title: 'Hello workspace',
        messageCount: 2,
        lastUserMessage: 'Hello workspace',
        busy: true
      })
    ]);

    const chatRoot = path.join(globalWorkspaceChatsDir(workspaceRoot), chat.id);
    expectJsonFile(path.join(globalWorkspaceChatsDir(workspaceRoot), 'index.json'));
    expectJsonFile(path.join(chatRoot, 'meta.json'));
    expectJsonFile(path.join(chatRoot, 'state.json'));
    expectJsonlFile(path.join(chatRoot, 'messages.jsonl'), 2);
    expectJsonlFile(path.join(chatRoot, 'history.jsonl'), 1);

    const restarted = new ChatRepository({ workspaceRoot });
    const restored = await restarted.get(chat.id);
    expect(restored).toMatchObject({
      id: 'chat-1',
      title: 'Manual title',
      lastAnswer: 'Hi there.',
      busy: true,
      activity: 'thinking',
      usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
    });
    expect(restored?.messages.map((message) => message.id)).toEqual(['message-1', 'message-2']);
    expect(restored?.messages[0]).toMatchObject(userMessage);
    expect(restored?.history).toEqual([{ role: 'user', content: 'Hello workspace' }]);
    expect(restored?.activePlan?.items[0]).toMatchObject({ id: 'step-1', status: 'in_progress' });
  });

  it('rebuilds a damaged index from chat directories', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-a', 'chat-b']),
      now: () => 2000
    });
    await repository.create({ model: 'model-a', title: 'First' });
    await repository.create({ model: 'model-b', title: 'Second' });
    const indexPath = path.join(globalWorkspaceChatsDir(workspaceRoot), 'index.json');
    fs.writeFileSync(indexPath, '{not-json', 'utf8');

    const summaries = await repository.list();

    expect(summaries.map((summary) => summary.id).sort()).toEqual(['chat-a', 'chat-b']);
    expect(JSON.parse(fs.readFileSync(indexPath, 'utf8'))).toMatchObject({
      schemaVersion: 1,
      chats: expect.arrayContaining([
        expect.objectContaining({ id: 'chat-a' }),
        expect.objectContaining({ id: 'chat-b' })
      ])
    });
  });

  it('lists an empty workspace without creating chat storage until first write', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const repository = new ChatRepository({ workspaceRoot });

    await expect(repository.list()).resolves.toEqual([]);
    expect(fs.existsSync(globalWorkspaceChatsDir(workspaceRoot))).toBe(false);

    await repository.create({ model: 'model-a' });
    expect(fs.statSync(globalWorkspaceChatsDir(workspaceRoot)).isDirectory()).toBe(true);
  });

  it('clears messages, history and transient state while keeping the chat id and model', async () => {
    const workspaceRoot = createWorkspaceRoot();
    let now = 3000;
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-clear', 'message-1']),
      now: () => now
    });
    const chat = await repository.create({ model: 'model-a', title: 'Custom title' });
    await repository.appendMessage(chat.id, { role: 'user', content: 'Clear me' });
    await repository.appendHistory(chat.id, { role: 'user', content: 'Clear me' });
    await repository.updateState(chat.id, { busy: true, activity: 'thinking' });

    now = 4000;
    const cleared = await repository.clear(chat.id);

    expect(cleared).toMatchObject({
      id: 'chat-clear',
      title: 'New chat',
      model: 'model-a',
      messages: [],
      history: [],
      lastAnswer: '',
      busy: false,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      updatedAt: 4000
    });
    expect(cleared.activity).toBeUndefined();
    const chatRoot = path.join(globalWorkspaceChatsDir(workspaceRoot), chat.id);
    expect(fs.readFileSync(path.join(chatRoot, 'messages.jsonl'), 'utf8')).toBe('');
    expect(fs.readFileSync(path.join(chatRoot, 'history.jsonl'), 'utf8')).toBe('');
  });

  it('deletes chat storage and rebuilds the index', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-delete', 'chat-keep']),
      now: () => 4500
    });
    const deleted = await repository.create({ model: 'model-a', title: 'Delete me' });
    const kept = await repository.create({ model: 'model-b', title: 'Keep me' });

    await repository.delete(deleted.id);

    expect(await repository.get(deleted.id)).toBeUndefined();
    expect(await repository.list()).toEqual([expect.objectContaining({ id: kept.id })]);
    expect(fs.existsSync(path.join(globalWorkspaceChatsDir(workspaceRoot), deleted.id))).toBe(false);
  });

  it('supports runtime message, history, state and usage mutations for file-backed runs', async () => {
    const workspaceRoot = createWorkspaceRoot();
    let now = 5000;
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-runtime', 'message-tool']),
      now: () => now
    });
    const chat = await repository.create({ model: 'model-runtime' });
    const toolMessage = await repository.appendMessage(chat.id, {
      role: 'tool',
      name: 'read_file',
      status: 'waiting',
      args: { path: 'README.md' }
    });

    now = 5100;
    await repository.updateMessage(chat.id, toolMessage.id, {
      status: 'done',
      result: { ok: true, content: 'readme' },
      modelResult: { ok: true, contentPreview: 'readme' }
    });
    await repository.setHistory(chat.id, [
      { role: 'user', content: 'Read README' },
      { role: 'tool', tool_call_id: 'call-1', content: '{"ok":true}' }
    ]);
    await repository.setLastAnswer(chat.id, 'Done');
    await repository.addUsage(chat.id, { promptTokens: 3, completionTokens: 4, totalTokens: 7, costUsd: 0.01 });
    await repository.setBusy(chat.id, true);
    await repository.setActivity(chat.id, 'runningTool', 'Reading file');
    await repository.setModelRequest(chat.id, {
      model: 'model-runtime',
      attempt: 1,
      maxAttempts: 3,
      requestNumber: 1,
      phase: 'completed',
      stream: false,
      startedAt: 5000,
      updatedAt: 5100
    });
    await repository.updateModelRequest(chat.id, { durationMs: 100 });
    await repository.setContext(chat.id, { tokens: 12, maxTokens: 100, percent: 12 });

    const restored = await new ChatRepository({ workspaceRoot }).get(chat.id);

    expect(restored).toMatchObject({
      id: 'chat-runtime',
      lastAnswer: 'Done',
      busy: true,
      activity: 'runningTool',
      activityDetail: 'Reading file',
      usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7, costUsd: 0.01 },
      modelRequest: { phase: 'completed', durationMs: 100 },
      context: { tokens: 12, maxTokens: 100, percent: 12 },
      contextLength: 12
    });
    expect(restored?.messages).toEqual([
      expect.objectContaining({
        id: 'message-tool',
        role: 'tool',
        status: 'done',
        result: { ok: true, content: 'readme' },
        modelResult: { ok: true, contentPreview: 'readme' }
      })
    ]);
    expect(restored?.history).toEqual([
      { role: 'user', content: 'Read README' },
      { role: 'tool', tool_call_id: 'call-1', content: '{"ok":true}' }
    ]);
  });
});

function createWorkspaceRoot(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-chat-repository-'));
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
