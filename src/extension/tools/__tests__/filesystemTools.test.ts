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
    RelativePattern: class {
      constructor(
        public readonly baseUri: { fsPath: string },
        public readonly pattern: string
      ) {}
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
          if (content !== undefined) {
            return {
              type: 1,
              size: Buffer.byteLength(content, 'utf8')
            };
          }

          const directoryPrefix = uri.fsPath.endsWith('/') ? uri.fsPath : `${uri.fsPath}/`;
          const isDirectory =
            uri.fsPath === vscodeMock.workspaceRoot ||
            Array.from(vscodeMock.files.keys()).some((filePath) => filePath.startsWith(directoryPrefix));

          if (!isDirectory) {
            throw new Error(`File not found: ${uri.fsPath}`);
          }

          return {
            type: 2,
            size: 0
          };
        }),
        readDirectory: vi.fn(),
        createDirectory: vi.fn(),
        writeFile: vi.fn(),
        delete: vi.fn()
      },
      findFiles: vi.fn(async (includePattern: { baseUri: { fsPath: string } }, _excludePattern: string, maxResults) => {
        const basePath = includePattern.baseUri.fsPath;
        const directoryPrefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
        return Array.from(vscodeMock.files.keys())
          .filter((filePath) => filePath.startsWith(directoryPrefix))
          .slice(0, maxResults)
          .map(file);
      })
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

  it('exposes compact grep_search controls in the model tool schema', () => {
    const grepSearchTool = filesystemTools.find((tool) => tool.function.name === 'grep_search');
    const properties = grepSearchTool?.function.parameters.properties || {};

    expect(properties).toHaveProperty('filesOnly');
    expect(properties).toHaveProperty('countOnly');
    expect(properties).toHaveProperty('beforeLines');
    expect(properties).toHaveProperty('afterLines');
    expect(properties).toHaveProperty('exclude');
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

  it('keeps grep_search contextLines behavior unchanged', async () => {
    setWorkspaceFile('src/example.ts', ['before', 'target line', 'after'].join('\n'));

    const result = await runFilesystemTool('grep_search', {
      reason: 'find target',
      query: 'target',
      path: '.',
      contextLines: 1
    });

    expect(result).toMatchObject({
      ok: true,
      matches: [
        {
          path: 'src/example.ts',
          line: 2,
          column: 1,
          text: 'target line',
          before: ['before'],
          after: ['after']
        }
      ],
      totalMatches: 1,
      truncated: false
    });
  });

  it('supports asymmetric grep_search context controls', async () => {
    setWorkspaceFile('src/example.ts', ['one', 'two', 'target line', 'four', 'five'].join('\n'));

    const result = await runFilesystemTool('grep_search', {
      reason: 'find target',
      query: 'target',
      path: '.',
      beforeLines: 2,
      afterLines: 1
    });

    expect(result.matches).toEqual([
      {
        path: 'src/example.ts',
        line: 3,
        column: 1,
        text: 'target line',
        before: ['one', 'two'],
        after: ['four']
      }
    ]);
  });

  it('returns only unique paths for grep_search filesOnly mode', async () => {
    setWorkspaceFile('src/one.ts', ['target a', 'target b'].join('\n'));
    setWorkspaceFile('src/two.ts', 'target c');

    const result = await runFilesystemTool('grep_search', {
      reason: 'find files',
      query: 'target',
      path: '.',
      filesOnly: true
    });

    expect(result).toMatchObject({
      ok: true,
      filesOnly: true,
      countOnly: false,
      matches: [{ path: 'src/one.ts' }, { path: 'src/two.ts' }]
    });
    expect(JSON.stringify(result.matches)).not.toContain('target');
  });

  it('returns per-file counts for grep_search countOnly mode', async () => {
    setWorkspaceFile('src/one.ts', ['target a', 'target b'].join('\n'));
    setWorkspaceFile('src/two.ts', 'target c');

    const result = await runFilesystemTool('grep_search', {
      reason: 'count matches',
      query: 'target',
      path: '.',
      countOnly: true
    });

    expect(result).toMatchObject({
      ok: true,
      filesOnly: false,
      countOnly: true,
      totalMatches: 3,
      matches: [
        { path: 'src/one.ts', count: 2 },
        { path: 'src/two.ts', count: 1 }
      ]
    });
    expect(JSON.stringify(result.matches)).not.toContain('target');
  });

  it('applies grep_search exclude in addition to standard ignored paths', async () => {
    setWorkspaceFile('src/keep.ts', 'target');
    setWorkspaceFile('src/skip.generated.ts', 'target');
    setWorkspaceFile('node_modules/pkg/index.ts', 'target');

    const result = await runFilesystemTool('grep_search', {
      reason: 'find target outside excluded files',
      query: 'target',
      path: '.',
      exclude: '**/*.generated.ts'
    });

    expect(result).toMatchObject({
      ok: true,
      exclude: ['**/*.generated.ts'],
      matches: [
        {
          path: 'src/keep.ts',
          line: 1,
          column: 1,
          text: 'target'
        }
      ],
      totalMatches: 1
    });
  });

  it('reports grep_search regex errors with tool context', async () => {
    await expect(
      runFilesystemTool('grep_search', {
        reason: 'bad regex',
        query: '[',
        path: '.',
        regex: true
      })
    ).rejects.toThrow('Invalid grep_search regex');
  });
});
