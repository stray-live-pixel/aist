import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

describe('ChatRepository', () => {
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
