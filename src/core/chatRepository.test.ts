import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { ChatRepository } from './chatRepository';
import { workspaceChatsDir } from './storage';

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

    const chatRoot = path.join(workspaceChatsDir(workspaceRoot), chat.id);
    expectJsonFile(path.join(workspaceChatsDir(workspaceRoot), 'index.json'));
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
    const indexPath = path.join(workspaceChatsDir(workspaceRoot), 'index.json');
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
