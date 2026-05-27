import { describe, expect, it, vi } from 'vitest';

import { handleWebviewPermissionMessage } from './permissions';
import type { AgentWebviewMessageDeps } from './types';

vi.mock('../../../tools/permissions', () => ({
  setToolPermission: vi.fn(),
  setToolPermissionPreset: vi.fn(async () => true)
}));

describe('handleWebviewPermissionMessage', () => {
  it('maps approval comments into trimmed runtime decisions', async () => {
    const deps = createDeps();

    await handleWebviewPermissionMessage(
      {
        type: 'resolveToolCall',
        messageId: 'tool-1',
        decision: 'deny-continue',
        comment: '  Try a read-only command instead.  '
      },
      deps
    );

    expect(deps.resolveToolCall).toHaveBeenCalledWith('tool-1', {
      approved: false,
      continueAfterDeny: true,
      comment: 'Try a read-only command instead.'
    });
  });
});

function createDeps(): AgentWebviewMessageDeps {
  return {
    sendState: vi.fn(),
    resolveToolCall: vi.fn(),
    openWorkspaceFile: vi.fn(),
    copyMessage: vi.fn(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  } as unknown as AgentWebviewMessageDeps;
}
