import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import type { StoredChatIndex } from '../chatRepository/StoredChatIndex';
import { createIdFactory, createWorkspaceRoot } from './helpers';

/**
 * Что это: regression-тест горячих transient state updates.
 * Зачем нужно: activity/modelRequest меняются часто и не должны пересобирать persisted index всех чатов.
 * Какую продуктовую проблему решает: два streaming-агента не создают лишние чтения всей истории чатов.
 */
describe('ChatRepository hot state updates', () => {
  it('keeps index stable while chat.get sees updated activity detail', async () => {
    const workspaceRoot = createWorkspaceRoot();
    let now = 1000;
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-1', 'chat-2']),
      now: () => now
    });

    const firstChat = await repository.create({ model: 'model-a' });
    now = 1100;
    await repository.create({ model: 'model-b' });
    const indexPath = path.join(globalWorkspaceChatsDir(workspaceRoot), 'index.json');
    const beforeIndex = readIndex({ indexPath });

    now = 1200;
    await repository.setActivityDetail(firstChat.id, 'Streaming detail');

    const updatedChat = await repository.get(firstChat.id);
    const afterIndex = readIndex({ indexPath });

    expect(updatedChat?.activityDetail).toBe('Streaming detail');
    expect(afterIndex).toEqual(beforeIndex);
    await expect(repository.list()).resolves.toEqual(beforeIndex.chats);
  });
});

function readIndex({ indexPath }: { indexPath: string }): StoredChatIndex {
  return JSON.parse(fs.readFileSync(indexPath, 'utf8')) as StoredChatIndex;
}
