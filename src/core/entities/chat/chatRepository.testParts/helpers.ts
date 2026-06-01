import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalWorkspaceChatsDir } from '../../storage/storage';
import { ChatRepository } from '../chatRepository';

export const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

export function createWorkspaceRoot(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-chat-repository-'));
  tempDirs.push(tempDir);
  return path.join(tempDir, 'workspace');
}

export function createIdFactory(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] || `generated-${index}`;
}

export function expectJsonFile(filePath: string): void {
  expect(() => JSON.parse(fs.readFileSync(filePath, 'utf8'))).not.toThrow();
}

export function expectJsonlFile(filePath: string, expectedLines: number): void {
  const lines = fs.readFileSync(filePath, 'utf8').trimEnd().split('\n');
  expect(lines).toHaveLength(expectedLines);
  for (const line of lines) {
    expect(() => JSON.parse(line)).not.toThrow();
  }
}
