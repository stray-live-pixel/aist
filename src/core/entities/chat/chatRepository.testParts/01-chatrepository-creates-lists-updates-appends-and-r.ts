import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

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
});
