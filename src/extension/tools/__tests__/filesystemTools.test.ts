import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filesystemTools, runFilesystemTool } from '../filesystemTools';

const vscodeMock = vi.hoisted(() => ({
  workspaceRoot: '/tmp/aist-workspace',
  files: new Map<string, string>()
}));

vi.mock('vscode', () => {
  const file = (fsPath: string) => ({
    fsPath,
    scheme: 'file',
    toString: () => `file://${fsPath}`
  });

  return {
    FileType: {
      File: 1,
      Directory: 2
    },
    Uri: {
      file,
      joinPath: (uri: { fsPath: string }, ...segments: string[]) => file([uri.fsPath, ...segments].join('/'))
    },
    workspace: {
      workspaceFolders: [
        {
          name: 'aist-workspace',
          uri: file(vscodeMock.workspaceRoot)
        }
      ],
      fs: {
        readFile: vi.fn(async (uri: { fsPath: string }) => {
          const content = vscodeMock.files.get(uri.fsPath);
          if (content === undefined) {
            throw new Error(`File not found: ${uri.fsPath}`);
          }

          return Buffer.from(content, 'utf8');
        }),
        stat: vi.fn(async (uri: { fsPath: string }) => {
          const content = vscodeMock.files.get(uri.fsPath);
          if (content === undefined) {
            throw new Error(`File not found: ${uri.fsPath}`);
          }

          return {
            type: 1,
            size: Buffer.byteLength(content, 'utf8')
          };
        }),
        readDirectory: vi.fn(),
        createDirectory: vi.fn(),
        writeFile: vi.fn(),
        delete: vi.fn()
      },
      findFiles: vi.fn(async () => [])
    },
    window: {
      activeTextEditor: undefined,
      visibleTextEditors: []
    },
    commands: {
      executeCommand: vi.fn()
    }
  };
});

function setWorkspaceFile(relativePath: string, content: string): void {
  vscodeMock.files.set(path.join(vscodeMock.workspaceRoot, relativePath), content);
}

describe('filesystemTools', () => {
  beforeEach(() => {
    vscodeMock.files.clear();
  });

  it('exposes read_file_range in the model tool list', () => {
    expect(filesystemTools.map((tool) => tool.function.name)).toContain('read_file_range');
  });

  it('keeps read_file behavior unchanged', async () => {
    setWorkspaceFile('src/example.ts', 'one\ntwo\nthree');

    await expect(
      runFilesystemTool('read_file', {
        reason: 'inspect whole file',
        path: 'src/example.ts',
        maxChars: 1000
      })
    ).resolves.toEqual({
      ok: true,
      path: 'src/example.ts',
      content: 'one\ntwo\nthree',
      truncated: false
    });
  });

  it('reads an inclusive line range and clamps it to file bounds', async () => {
    setWorkspaceFile('src/example.ts', 'one\ntwo\nthree');

    await expect(
      runFilesystemTool('read_file_range', {
        reason: 'inspect matching context',
        path: 'src/example.ts',
        startLine: 0,
        endLine: 10
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/example.ts',
      startLine: 1,
      endLine: 3,
      totalLines: 3,
      content: 'one\ntwo\nthree',
      truncatedRange: true
    });
  });

  it('rejects invalid ranges before reading the file', async () => {
    setWorkspaceFile('src/example.ts', 'one\ntwo\nthree');

    await expect(
      runFilesystemTool('read_file_range', {
        reason: 'inspect matching context',
        path: 'src/example.ts',
        startLine: 3,
        endLine: 2
      })
    ).rejects.toThrow('startLine');
  });

  it('reports missing files through the workspace filesystem', async () => {
    await expect(
      runFilesystemTool('read_file_range', {
        reason: 'inspect matching context',
        path: 'src/missing.ts',
        startLine: 1,
        endLine: 2
      })
    ).rejects.toThrow('File not found');
  });

  it('limits large ranges to 400 lines', async () => {
    setWorkspaceFile('src/large.ts', Array.from({ length: 500 }, (_, index) => `line ${index + 1}`).join('\n'));

    const result = await runFilesystemTool('read_file_range', {
      reason: 'inspect matching context',
      path: 'src/large.ts',
      startLine: 50,
      endLine: 500
    });

    expect(result).toMatchObject({
      ok: true,
      path: 'src/large.ts',
      startLine: 50,
      endLine: 449,
      totalLines: 500,
      truncatedRange: true
    });
    expect(String(result.content).split('\n')).toHaveLength(400);
    expect(result.content).toContain('line 50');
    expect(result.content).toContain('line 449');
    expect(result.content).not.toContain('line 450');
  });

  it('rejects paths outside the workspace', async () => {
    await expect(
      runFilesystemTool('read_file_range', {
        reason: 'inspect matching context',
        path: '../outside.ts',
        startLine: 1,
        endLine: 2
      })
    ).rejects.toThrow('outside the workspace');
  });
});
