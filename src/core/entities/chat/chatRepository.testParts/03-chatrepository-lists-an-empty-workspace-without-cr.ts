import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

describe('ChatRepository', () => {
  it('lists an empty workspace without creating chat storage until first write', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const repository = new ChatRepository({ workspaceRoot });

    await expect(repository.list()).resolves.toEqual([]);
    expect(fs.existsSync(globalWorkspaceChatsDir(workspaceRoot))).toBe(false);

    await repository.create({ model: 'model-a' });
    expect(fs.statSync(globalWorkspaceChatsDir(workspaceRoot)).isDirectory()).toBe(true);
  });
});
