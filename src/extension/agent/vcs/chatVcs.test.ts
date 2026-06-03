import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createChatVcsService } from './chatVcs';

const tempRoots: string[] = [];

/**
 * Что это: regression-тест VCS-сервиса для проекта без git.
 * Зачем нужно: refresh из Composer не должен открывать AIST error, если workspace не является репозиторием.
 * Какую продуктовую проблему решает: обычные проекты без VCS остаются рабочими и ведут пользователя в настройки VCS.
 */
describe('createChatVcsService', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('returns empty current state instead of throwing in a non-git workspace', async () => {
    const workspaceRoot = await createTempWorkspace();
    const service = createChatVcsService({ workspaceRoot });

    await expect(service.getCurrentState()).resolves.toBeUndefined();
  });

  it('reads the current VCS command dynamically for refresh', async () => {
    const workspaceRoot = await createTempWorkspace();
    const calls: string[] = [];
    const service = createChatVcsService({
      workspaceRoot,
      command: () => {
        calls.push('read');
        return 'git';
      }
    });

    await service.getCurrentState();

    expect(calls).toEqual(['read']);
  });
});

async function createTempWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-vcs-'));
  tempRoots.push(root);
  return root;
}
