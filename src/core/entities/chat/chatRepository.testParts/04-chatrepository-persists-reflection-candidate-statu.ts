import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';
import { createIdFactory, createWorkspaceRoot, expectJsonFile, expectJsonlFile, tempDirs } from './helpers';

describe('ChatRepository', () => {
  it('persists reflection candidate status after restart', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const repository = new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-candidates']),
      now: () => 2500
    });
    const chat = await repository.create({ model: 'model-a' });
    await repository.addReflectionCandidates(chat.id, [
      {
        id: 'candidate-1',
        kind: 'project_lesson',
        title: 'Project rule',
        content: 'Use focused tests for memory regressions.',
        status: 'pending',
        createdAt: 2500,
        sourceSubagentRunId: 'run-1'
      }
    ]);

    const updated = await repository.setReflectionCandidateStatus(chat.id, 'candidate-1', 'rejected');
    const restored = await new ChatRepository({ workspaceRoot }).get(chat.id);

    expect(updated).toMatchObject({ id: 'candidate-1', status: 'rejected' });
    expect(restored?.reflectionCandidates).toEqual([
      expect.objectContaining({ id: 'candidate-1', status: 'rejected', sourceSubagentRunId: 'run-1' })
    ]);
  });
});
