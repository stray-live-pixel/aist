import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatRepository } from '../../../core/chatRepository';
import { createFileBackedChatStore } from './fileBackedChatStore';

type Listener<T> = (event: T) => unknown;

vi.mock('vscode', () => {
  class EventEmitter<T> {
    private listeners: Listener<T>[] = [];

    event = (listener: Listener<T>) => {
      this.listeners.push(listener);
      return { dispose: () => undefined };
    };

    fire(event: T): void {
      for (const listener of this.listeners) {
        listener(event);
      }
    }

    dispose(): void {
      this.listeners = [];
    }
  }

  return { EventEmitter };
});

const tempRoots: string[] = [];

describe('FileBackedChatStore', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('projects synchronous chat state while persisting through ChatRepository', async () => {
    const repository = new ChatRepository({ workspaceRoot: await createWorkspaceRoot() });
    const activeIds: Array<string | undefined> = [];
    const store = await createFileBackedChatStore({
      repository,
      defaultModel: 'model-a',
      saveActiveChatId: async (chatId) => {
        activeIds.push(chatId);
      }
    });
    const chat = store.getActiveChat();

    const message = store.appendMessage(chat.id, { role: 'user', content: 'Hello file backed storage' });
    store.setBusy(chat.id, true);
    await store.flushPendingWrites();

    const restored = await repository.get(chat.id);
    expect(restored).toMatchObject({
      id: chat.id,
      title: 'Hello file backed storage',
      model: 'model-a',
      busy: true
    });
    expect(restored?.messages[0]).toMatchObject({ id: message.id, role: 'user' });
    expect(activeIds).toContain(chat.id);
  });

  it('resets transient run state on load without losing persisted messages', async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const repository = new ChatRepository({ workspaceRoot, idFactory: createIdFactory(['chat-1', 'message-1']) });
    const chat = await repository.create({ model: 'model-a' });
    await repository.appendMessage(chat.id, {
      role: 'tool',
      name: 'write_file',
      status: 'waiting',
      approval: 'pending'
    });
    await repository.setBusy(chat.id, true);

    const store = await createFileBackedChatStore({ repository, activeChatId: chat.id });
    await store.flushPendingWrites();

    const activeChat = store.getActiveChat();
    expect(activeChat.busy).toBe(false);
    expect(activeChat.messages[0]).toMatchObject({
      role: 'tool',
      status: 'error',
      approval: 'denied',
      result: { ok: false, error: 'Extension was restarted.' }
    });
    await expect(repository.get(chat.id)).resolves.toMatchObject({
      busy: false,
      messages: [expect.objectContaining({ status: 'error', approval: 'denied' })]
    });
  });

  it('deletes file-backed chats and retargets the active chat', async () => {
    const repository = new ChatRepository({ workspaceRoot: await createWorkspaceRoot() });
    const store = await createFileBackedChatStore({ repository, defaultModel: 'model-a' });
    const first = store.getActiveChat();
    const second = store.createChat('model-b');

    const active = store.deleteChat(second.id, 'model-a');
    await store.flushPendingWrites();

    expect(active.id).toBe(first.id);
    expect(store.getActiveChat().id).toBe(first.id);
    expect(await repository.list()).toEqual([expect.objectContaining({ id: first.id })]);
  });
});

async function createWorkspaceRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-file-backed-store-'));
  tempRoots.push(root);
  return path.join(root, 'workspace');
}

function createIdFactory(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] || `generated-${index}`;
}
