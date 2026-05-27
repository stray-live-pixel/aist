import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDeclarativeInstructionSources } from './agentConfigStore';

const workspaceMock = vi.hoisted(() => ({ root: '' }));

vi.mock('../../shared/workspace', () => ({
  getWorkspaceFolder: () => ({ uri: { fsPath: workspaceMock.root } })
}));

let tempDir = '';

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-declarative-instructions-'));
  workspaceMock.root = tempDir;
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('getDeclarativeInstructionSources', () => {
  it('loads project instructions and prompt policy with explicit source metadata', () => {
    writeWorkspaceFile('.aist-agent/instructions/project.md', 'Use focused tests for prompt changes.\n');
    writeWorkspaceFile('.aist-agent/policies/prompt-policy.md', 'Do not expand the immutable kernel.\n');

    expect(getDeclarativeInstructionSources()).toEqual([
      {
        id: '.aist-agent/instructions/project.md',
        title: '.aist-agent project instructions',
        content: 'Use focused tests for prompt changes.',
        priority: 12,
        kind: 'declarative',
        source: '.aist-agent/instructions/project.md'
      },
      {
        id: '.aist-agent/policies/prompt-policy.md',
        title: '.aist-agent prompt policy',
        content: 'Do not expand the immutable kernel.',
        priority: 14,
        kind: 'declarative',
        source: '.aist-agent/policies/prompt-policy.md'
      }
    ]);
  });

  it('rereads file changes and deletions without cached state', () => {
    expect(getDeclarativeInstructionSources()).toEqual([]);

    writeWorkspaceFile('.aist-agent/instructions/project.md', 'First version');
    expect(getDeclarativeInstructionSources()[0]?.content).toBe('First version');

    writeWorkspaceFile('.aist-agent/instructions/project.md', 'Second version');
    expect(getDeclarativeInstructionSources()[0]?.content).toBe('Second version');

    fs.rmSync(path.join(tempDir, '.aist-agent/instructions/project.md'));
    expect(getDeclarativeInstructionSources()).toEqual([]);
  });
});

function writeWorkspaceFile(relativePath: string, content: string): void {
  const filePath = path.join(tempDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}
