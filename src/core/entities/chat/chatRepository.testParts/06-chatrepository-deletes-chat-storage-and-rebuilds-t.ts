import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

describe('ChatRepository', () => {
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
});
