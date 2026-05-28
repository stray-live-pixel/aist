import { describe, expect, it, vi } from 'vitest';

import { runAgentSkill } from './skills';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: []
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath })
  },
  FileType: {
    File: 1,
    Directory: 2
  }
}));

describe('runAgentSkill structured errors', () => {
  it('returns INVALID_ARGUMENT for malformed custom skill calls', async () => {
    await expect(runAgentSkill({ reason: 'run missing skill' })).resolves.toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      error: expect.stringContaining('skillId'),
      details: { argument: 'skillId' }
    });
  });
});
