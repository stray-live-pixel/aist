import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

describe('ChatRepository', () => {
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
});
