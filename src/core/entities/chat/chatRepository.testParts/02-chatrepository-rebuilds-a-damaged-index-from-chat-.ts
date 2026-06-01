import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

describe('ChatRepository', () => {
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
});
