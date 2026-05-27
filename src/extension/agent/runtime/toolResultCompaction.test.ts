import { describe, expect, it } from 'vitest';

import { createCompactionMessages } from './compaction';
import { buildModelToolResult } from './toolResultCompaction';

describe('buildModelToolResult', () => {
  it('keeps small read_file outputs intact', () => {
    const result = {
      ok: true,
      path: 'src/small.ts',
      content: 'one\ntwo\nthree',
      truncated: false
    };

    expect(buildModelToolResult('read_file', { path: 'src/small.ts' }, result)).toEqual(result);
  });

  it('keeps small preview-backed edit results in the legacy model-facing shape', () => {
    const result = {
      ok: true,
      path: 'src/small.ts',
      bytes: 12,
      changedStartLine: 1,
      changedEndLine: 1
    };

    expect(
      buildModelToolResult(
        'write_file',
        { path: 'src/small.ts' },
        {
          preview: {
            ok: true,
            path: 'src/small.ts',
            diffShown: true,
            editable: true
          },
          result
        }
      )
    ).toEqual(result);
  });

  it('compacts large read_file content while preserving UI result separately', () => {
    const content = Array.from({ length: 700 }, (_, index) => `line ${index + 1}: ${'x'.repeat(12)}`).join('\n');
    const uiResult = {
      ok: true,
      path: 'src/large.ts',
      content,
      truncated: false
    };

    const modelResult = buildModelToolResult('read_file', { path: 'src/large.ts' }, uiResult);

    expect(uiResult.content).toBe(content);
    expect(modelResult).toMatchObject({
      ok: true,
      path: 'src/large.ts',
      contentChars: content.length,
      contentLines: 700,
      truncatedByTool: false,
      modelResultNotice: {
        compacted: true,
        fullResultStoredIn: 'ChatMessage.result'
      }
    });
    expect(String(modelResult.contentPreview)).toContain('chars omitted from model history');
    expect(JSON.stringify(modelResult)).not.toContain('line 350:');
    expect(JSON.stringify(modelResult).length).toBeLessThan(content.length);
  });

  it('compacts large run_bash_script streams to metadata and previews', () => {
    const stdout = `start\n${'a'.repeat(10000)}\nend`;
    const uiResult = {
      ok: true,
      cwd: '.',
      exitCode: 0,
      signal: null,
      timedOut: false,
      durationMs: 123,
      stdout,
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false
    };

    const modelResult = buildModelToolResult('run_bash_script', { script: 'printf big' }, uiResult);

    expect(modelResult).toMatchObject({
      ok: true,
      cwd: '.',
      exitCode: 0,
      timedOut: false,
      stdoutChars: stdout.length,
      stdoutTruncatedByTool: false,
      modelResultNotice: {
        compacted: true,
        tool: 'run_bash_script'
      }
    });
    expect(modelResult).not.toHaveProperty('stdout');
    expect(String(modelResult.stdoutPreview)).toContain('chars omitted from model history');
  });

  it('keeps error metadata when compacting large failing bash output', () => {
    const uiResult = {
      ok: false,
      code: 'INVALID_ARGUMENT',
      error: 'Bash script exited with code 2.',
      cwd: '.',
      exitCode: 2,
      timedOut: false,
      stdout: 'x'.repeat(10000),
      stderr: 'failure',
      stdoutTruncated: true,
      stderrTruncated: false
    };

    const modelResult = buildModelToolResult('run_bash_script', { script: 'bad' }, uiResult);

    expect(modelResult).toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      error: 'Bash script exited with code 2.',
      exitCode: 2,
      stdoutChars: 10000,
      stdoutTruncatedByTool: true
    });
    expect(modelResult).not.toHaveProperty('stdout');
  });

  it('compacts grep_search to top matches and omits raw overflow', () => {
    const matches = Array.from({ length: 40 }, (_, index) => ({
      path: `src/file-${index}.ts`,
      line: index + 1,
      column: 1,
      text: `target ${index}`
    }));
    const uiResult = {
      ok: true,
      query: 'target',
      path: '.',
      totalMatches: 40,
      filesInspected: 40,
      matches,
      truncated: true
    };

    const modelResult = buildModelToolResult('grep_search', { query: 'target' }, uiResult);

    expect(modelResult).toMatchObject({
      ok: true,
      query: 'target',
      returnedMatches: 40,
      omittedMatches: 15,
      truncatedByTool: true
    });
    expect(modelResult.topMatches).toHaveLength(25);
    expect(JSON.stringify(modelResult)).not.toContain('src/file-39.ts');
  });

  it('compacts diff preview wrappers without losing changed file metadata', () => {
    const files = Array.from({ length: 35 }, (_, index) => ({
      path: `src/file-${index}.ts`,
      created: false,
      bytes: 100 + index,
      changedStartLine: 2,
      changedEndLine: 4
    }));
    const uiResult = {
      preview: {
        ok: true,
        diffShown: true,
        editable: true,
        files
      },
      result: {
        ok: true,
        files,
        changedFiles: files
      }
    };

    const modelResult = buildModelToolResult('apply_patch', { patch: '...' }, uiResult);

    expect(modelResult).toMatchObject({
      preview: {
        ok: true,
        diffShown: true,
        editable: true,
        changedFileCount: 35,
        omittedFiles: 10
      },
      result: {
        ok: true,
        changedFileCount: 35,
        omittedFiles: 10
      },
      modelResultNotice: {
        compacted: true
      }
    });
    expect((modelResult.preview as { files: unknown[] }).files).toHaveLength(25);
    expect((modelResult.result as { files: unknown[] }).files).toHaveLength(25);
  });

  it('feeds compaction prompts with model-facing summaries instead of raw dumps', () => {
    const stdout = 'raw-output '.repeat(2000);
    const modelResult = buildModelToolResult(
      'run_bash_script',
      { script: 'generate raw output' },
      {
        ok: true,
        cwd: '.',
        exitCode: 0,
        timedOut: false,
        durationMs: 10,
        stdout,
        stderr: '',
        stdoutTruncated: false,
        stderrTruncated: false
      }
    );

    const messages = createCompactionMessages([
      {
        role: 'tool',
        tool_call_id: 'call-1',
        content: JSON.stringify(modelResult, null, 2)
      }
    ]);

    expect(messages[1]?.content).toContain('stdoutPreview');
    expect(messages[1]?.content).toContain('fullResultStoredIn');
    expect(messages[1]?.content).not.toContain(stdout);
  });
});
