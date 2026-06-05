import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../../../types';
import { getToolCallIdsSignature } from './getToolCallIdsSignature';

describe('getToolCallIdsSignature', () => {
  it('stays stable for new arrays with the same tool ids', () => {
    const firstRender = getToolCallIdsSignature({ tools: [createTool('tool-1'), createTool('tool-2')] });
    const nextRender = getToolCallIdsSignature({ tools: [createTool('tool-1'), createTool('tool-2')] });

    expect(nextRender).toBe(firstRender);
  });

  it('changes when tool composition changes', () => {
    const firstRender = getToolCallIdsSignature({ tools: [createTool('tool-1')] });
    const nextRender = getToolCallIdsSignature({ tools: [createTool('tool-1'), createTool('tool-2')] });

    expect(nextRender).not.toBe(firstRender);
  });
});

function createTool(id: string): ChatMessage {
  return {
    id,
    role: 'tool',
    name: 'run_bash_script',
    status: 'done',
    createdAt: 1000
  };
}
