import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from './nodeFilesystemTools';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-node-fs-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('node filesystem tool definitions', () => {
  it('exposes CLI-safe filesystem tools without edit_file preview', () => {
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).toEqual([
      'list_files',
      'read_file',
      'read_file_range',
      'grep_search',
      'run_bash_script',
      'write_file',
      'replace_in_file',
      'create_directory',
      'delete_path'
    ]);
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('get_workspace_info');
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('outline_file');
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('edit_file');
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('apply_patch');
    expect(nodeFilesystemTools.find((tool) => tool.function.name === 'grep_search')?.function.parameters).toMatchObject(
      {
        required: ['reason', 'nextStep', 'query'],
        properties: {
          filesOnly: { type: 'boolean' },
          countOnly: { type: 'boolean' },
          beforeLines: { type: 'number' },
          afterLines: { type: 'number' },
          exclude: { type: 'string' }
        }
      }
    );
  });
});

describe('runNodeFilesystemTool', () => {
  it('returns workspace metadata and repo map hints', async () => {
    writeWorkspaceFile(
      'package.json',
      JSON.stringify({ name: 'sample', scripts: { test: 'vitest run', typecheck: 'tsc --noEmit' } })
    );
    writeWorkspaceFile('tsconfig.json', '{}');
    fs.mkdirSync(path.join(workspaceRoot, 'src'));

    const result = await run('get_workspace_info', { reason: 'inspect workspace' });

    expect(result).toMatchObject({
      ok: true,
      workspaceName: path.basename(workspaceRoot),
      workspacePath: fs.realpathSync(workspaceRoot),
      activeFile: null,
      activeLanguage: null,
      repoMap: {
        packageManager: 'npm',
        packageName: 'sample',
        scripts: ['test', 'typecheck'],
        verificationHints: ['npm run typecheck', 'npm run test']
      }
    });
  });

  it('lists files recursively and applies standard ignores', async () => {
    writeWorkspaceFile('src/index.ts', 'export const value = 1;\n');
    writeWorkspaceFile('src/nested/value.ts', 'export const nested = true;\n');
    writeWorkspaceFile('node_modules/pkg/index.ts', 'ignored\n');
    writeWorkspaceFile('.aist-agent/settings.json', '{}\n');

    const result = await run('list_files', {
      reason: 'inspect tree',
      path: '.',
      maxDepth: 3
    });

    expect(result).toMatchObject({
      ok: true,
      entries: [
        { path: 'src', type: 'directory' },
        { path: 'src/index.ts', type: 'file' },
        { path: 'src/nested', type: 'directory' },
        { path: 'src/nested/value.ts', type: 'file' }
      ],
      truncated: false
    });

    await expect(
      run('list_files', {
        reason: 'inspect subtree',
        path: 'src',
        maxDepth: 1
      })
    ).resolves.toMatchObject({
      ok: true,
      entries: [
        { path: 'index.ts', type: 'file' },
        { path: 'nested', type: 'directory' },
        { path: 'nested/value.ts', type: 'file' }
      ]
    });
  });

  it('reads full files and bounded line ranges', async () => {
    writeWorkspaceFile('src/example.ts', ['one', 'two', 'three'].join('\n'));

    await expect(
      run('read_file', {
        reason: 'inspect full file',
        path: 'src/example.ts',
        maxChars: 1000
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/example.ts',
      content: 'one\ntwo\nthree',
      truncated: false
    });

    await expect(
      run('read_file_range', {
        reason: 'inspect range',
        path: 'src/example.ts',
        startLine: 0,
        endLine: 2
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/example.ts',
      startLine: 1,
      endLine: 2,
      totalLines: 3,
      content: 'one\ntwo',
      truncatedRange: true
    });
  });

  it('rejects paths outside the workspace before filesystem access', async () => {
    const result = await run('read_file', {
      reason: 'unsafe read',
      path: '../outside.txt'
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'PATH_OUTSIDE_WORKSPACE',
      details: { path: '../outside.txt' }
    });
  });

  it('guards symlink escapes for existing and missing targets', async () => {
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-node-fs-outside-'));
    try {
      fs.symlinkSync(outsideRoot, path.join(workspaceRoot, 'linked-outside'), 'dir');

      await expect(
        run('read_file', {
          reason: 'unsafe symlink read',
          path: 'linked-outside/secret.txt'
        })
      ).resolves.toMatchObject({
        ok: false,
        code: 'PATH_OUTSIDE_WORKSPACE'
      });

      await expect(
        run('write_file', {
          reason: 'unsafe symlink write',
          path: 'linked-outside/new.txt',
          content: 'secret'
        })
      ).resolves.toMatchObject({
        ok: false,
        code: 'PATH_OUTSIDE_WORKSPACE'
      });
    } finally {
      fs.rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it('searches text with context, compact modes and excludes', async () => {
    writeWorkspaceFile('src/keep.ts', ['before', 'target line', 'after target'].join('\n'));
    writeWorkspaceFile('src/skip.generated.ts', 'target\n');
    writeWorkspaceFile('node_modules/pkg/index.ts', 'target\n');

    await expect(
      run('grep_search', {
        reason: 'search with context',
        query: 'target',
        path: '.',
        include: '**/*.ts',
        beforeLines: 1,
        afterLines: 1,
        exclude: '**/*.generated.ts'
      })
    ).resolves.toMatchObject({
      ok: true,
      matches: [
        {
          path: 'src/keep.ts',
          line: 2,
          column: 1,
          text: 'target line',
          before: ['before'],
          after: ['after target']
        },
        {
          path: 'src/keep.ts',
          line: 3,
          column: 7,
          text: 'after target',
          before: ['target line'],
          after: []
        }
      ],
      totalMatches: 2
    });

    await expect(
      run('grep_search', {
        reason: 'files only',
        query: 'target',
        filesOnly: true
      })
    ).resolves.toMatchObject({
      ok: true,
      filesOnly: true,
      countOnly: false,
      matches: [{ path: 'src/keep.ts' }, { path: 'src/skip.generated.ts' }]
    });

    await expect(
      run('grep_search', {
        reason: 'counts only',
        query: 'target',
        countOnly: true,
        exclude: '**/*.generated.ts'
      })
    ).resolves.toMatchObject({
      ok: true,
      filesOnly: false,
      countOnly: true,
      totalMatches: 2,
      matches: [{ path: 'src/keep.ts', count: 2 }]
    });
  });

  it('skips large and binary files during grep_search', async () => {
    writeWorkspaceFile('src/keep.txt', 'target\n');
    writeWorkspaceFile('src/binary.txt', Buffer.from([0, 1, 2, 116, 97, 114, 103, 101, 116]));
    writeWorkspaceFile('src/large.txt', `${'x'.repeat(1024 * 1024 + 1)}target`);

    const result = await run('grep_search', {
      reason: 'skip unreadable search files',
      query: 'target'
    });

    expect(result).toMatchObject({
      ok: true,
      filesInspected: 1,
      matches: [{ path: 'src/keep.txt', line: 1, column: 1, text: 'target' }],
      totalMatches: 1
    });
  });

  it('runs bash scripts inside the workspace with timeout handling', async () => {
    const success = await run('run_bash_script', {
      reason: 'verify cwd',
      script: 'pwd && printf done',
      timeoutMs: 5000
    });

    expect(success).toMatchObject({
      ok: true,
      cwd: '.',
      exitCode: 0,
      timedOut: false
    });
    expect(String(success.stdout)).toContain(workspaceRoot);
    expect(String(success.stdout)).toContain('done');

    await expect(
      run('run_bash_script', {
        reason: 'verify timeout',
        script: 'sleep 2',
        timeoutMs: 1000
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      timedOut: true
    });
  });

  it('writes, replaces, creates directories and deletes without trash', async () => {
    await expect(
      run('create_directory', {
        reason: 'create parent',
        path: 'src/nested'
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/nested'
    });

    await expect(
      run('write_file', {
        reason: 'write file',
        path: 'src/nested/example.ts',
        content: 'one\ntwo\n'
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/nested/example.ts',
      bytes: 8
    });

    await expect(
      run('replace_in_file', {
        reason: 'replace text',
        path: 'src/nested/example.ts',
        search: 'two',
        replace: 'deux'
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/nested/example.ts',
      replacements: 1,
      changedStartLine: 2,
      changedEndLine: 2
    });
    expect(fs.readFileSync(path.join(workspaceRoot, 'src/nested/example.ts'), 'utf8')).toBe('one\ndeux\n');

    await expect(
      run('delete_path', {
        reason: 'delete directory unsafely',
        path: 'src'
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT'
    });

    await expect(
      run('delete_path', {
        reason: 'delete directory recursively',
        path: 'src',
        recursive: true
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src',
      recursive: true,
      trash: false
    });
    expect(fs.existsSync(path.join(workspaceRoot, 'src'))).toBe(false);
  });

  it('returns an unknown tool error for removed outline_file legacy calls', async () => {
    await expect(
      run('outline_file', {
        reason: 'inspect symbols',
        path: 'src/plain.ts'
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      error: 'Unknown tool: outline_file',
      details: { toolName: 'outline_file' }
    });
  });
});

function run(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  return runNodeFilesystemTool({ context: { workspaceRoot }, toolName, args });
}

function writeWorkspaceFile(relativePath: string, content: string | Buffer): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
