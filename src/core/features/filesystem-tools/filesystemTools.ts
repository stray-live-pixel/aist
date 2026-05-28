import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { getRepoMap } from '../../shared/lib/repoMap';
import { createToolError, getErrorMessage, toStructuredToolFailure } from '../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../shared/types/types';
import { type AppliedPatch, applyUnifiedPatchToContents, parseUnifiedPatch } from '../../tools/applyPatch';

const MAX_READ_FILE_RANGE_LINES = 400;
const DEFAULT_OUTLINE_SYMBOL_LIMIT = 200;
const DEFAULT_OUTLINE_DEPTH = 4;
const MAX_SEARCH_FILE_BYTES = 1024 * 1024;
const STANDARD_IGNORED_NAMES = new Set(['.git', 'node_modules', 'dist', 'out', '.vscode-test']);

export type NodeFilesystemToolContext = {
  workspaceRoot: string;
  workspaceName?: string;
  activeFile?: string | null;
  activeLanguage?: string | null;
  outlineFile?(args: Record<string, unknown>, context: NodeFilesystemToolContext): Promise<Record<string, unknown>>;
};

type Workspace = {
  rootPath: string;
};

export type ResolvedWorkspacePath = {
  absolutePath: string;
  relativePath: string;
};

type SearchMatch = {
  path: string;
  line?: number;
  column?: number;
  text?: string;
  count?: number;
  before?: string[];
  after?: string[];
};

export const nodeFilesystemTools: OpenRouterTool[] = [
  // get_workspace_info пока не показываем модели: workspace/repo map должен передаваться в базовом контексте по умолчанию.
  // outline_file пока не используем: Node core без host document-symbol adapter всё равно возвращает unsupported.
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files and directories under a workspace-relative path.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative directory path. Use "." for root.' },
          maxDepth: { type: 'number', description: 'Maximum recursive depth. Default is 2.' },
          limit: { type: 'number', description: 'Maximum number of entries. Default is 200.' }
        },
        required: ['reason'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a UTF-8 text file from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative file path.' },
          maxChars: { type: 'number', description: 'Maximum characters to return. Default is 200000.' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  },
  // read_file_range пока не используем как model-visible tool; при необходимости агент может читать файл целиком через read_file.
  {
    type: 'function',
    function: {
      name: 'grep_search',
      description:
        'Search workspace files for text or a regular expression and return matching file paths with line numbers.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          query: { type: 'string', description: 'Text or regular expression to search for.' },
          path: { type: 'string', description: 'Workspace-relative file or directory path to search. Default is ".".' },
          include: { type: 'string', description: 'Glob pattern within the search path. Default is "**/*".' },
          regex: { type: 'boolean', description: 'Treat query as a JavaScript regular expression. Default is false.' },
          caseSensitive: { type: 'boolean', description: 'Use case-sensitive matching. Default is false.' },
          contextLines: {
            type: 'number',
            description: 'Number of lines before and after each match. Default is 0, maximum is 5.'
          },
          beforeLines: {
            type: 'number',
            description: 'Number of lines before each match. Defaults to contextLines, maximum is 5.'
          },
          afterLines: {
            type: 'number',
            description: 'Number of lines after each match. Defaults to contextLines, maximum is 5.'
          },
          filesOnly: {
            type: 'boolean',
            description: 'Return only unique matching file paths without line text. Default is false.'
          },
          countOnly: {
            type: 'boolean',
            description: 'Return matching file paths with match counts, without line text. Default is false.'
          },
          exclude: {
            type: 'string',
            description:
              'Additional glob pattern to exclude from search, combined with the standard ignored directories.'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of matches to return, or paths in compact modes. Default is 100.'
          },
          maxFiles: { type: 'number', description: 'Maximum number of files to inspect. Default is 2000.' }
        },
        required: ['reason', 'query'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_bash_script',
      description:
        'Run a Bash script from inside the workspace. Use for tests, builds, git-safe inspections, and shell-based diagnostics. Prefer write_file or replace_in_file for editing files; if using Bash for mass editing, explain why standard file-editing tools are not suitable.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this script needs to run.' },
          script: { type: 'string', description: 'Bash script to execute with bash -lc.' },
          cwd: { type: 'string', description: 'Workspace-relative directory to run in. Default is ".".' },
          timeoutMs: { type: 'number', description: 'Timeout in milliseconds. Default is 30000, maximum is 120000.' },
          maxOutputChars: {
            type: 'number',
            description: 'Maximum stdout/stderr characters to return per stream. Default is 200000.'
          }
        },
        required: ['reason', 'script'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite a UTF-8 text file in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative file path.' },
          content: { type: 'string', description: 'Full file content to write.' }
        },
        required: ['reason', 'path', 'content'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'replace_in_file',
      description: 'Replace text in an existing UTF-8 file.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative file path.' },
          search: { type: 'string', description: 'Exact text to find.' },
          replace: { type: 'string', description: 'Replacement text.' },
          all: { type: 'boolean', description: 'Replace all matches instead of only the first.' }
        },
        required: ['reason', 'path', 'search', 'replace'],
        additionalProperties: false
      }
    }
  },
  // apply_patch пока не показываем модели: на практике вызовы часто приходят в невалидном unified diff формате.
  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Create a workspace directory, including parent directories.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative directory path.' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_path',
      description:
        'Delete a workspace file or directory without using the OS trash. Directories require recursive=true.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative path.' },
          recursive: { type: 'boolean', description: 'Delete directories recursively.' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  }
];

export function createNodeFilesystemToolRunner(
  context: NodeFilesystemToolContext
): (toolName: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> {
  return (toolName, args) => runNodeFilesystemTool(context, toolName, args);
}

export function getNodeFilesystemChangedLineRange(beforeContent: string, afterContent: string): Record<string, number> {
  return getChangedLineRange(beforeContent, afterContent);
}

export function requireNodeFilesystemString(value: unknown, name: string): string {
  return requireString(value, name);
}

export async function resolveNodeWorkspacePath(
  context: NodeFilesystemToolContext,
  relativePath: string,
  options: { allowMissing: boolean }
): Promise<ResolvedWorkspacePath> {
  return resolveWorkspacePath(context, relativePath, options);
}

export async function readNodeTextFileIfExists(filePath: string): Promise<string | undefined> {
  return readFileIfExists(filePath);
}

export async function runNodeFilesystemTool(
  context: NodeFilesystemToolContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    switch (toolName) {
      case 'get_workspace_info':
        return await getWorkspaceInfo(context);
      case 'list_files':
        return await listFiles(context, args);
      case 'read_file':
        return await readFile(context, args);
      case 'read_file_range':
        return await readFileRange(context, args);
      case 'outline_file':
        return await outlineFile(context, args);
      case 'grep_search':
        return await grepSearch(context, args);
      case 'run_bash_script':
        return await runBashScript(context, args);
      case 'write_file':
        return await writeFile(context, args);
      case 'replace_in_file':
        return await replaceInFile(context, args);
      case 'apply_patch':
        return await applyPatch(context, args);
      case 'create_directory':
        return await createDirectory(context, args);
      case 'delete_path':
        return await deletePath(context, args);
      default:
        throw createToolError('INVALID_ARGUMENT', `Unknown tool: ${toolName}`, { toolName });
    }
  } catch (error) {
    return toStructuredToolFailure(error);
  }
}

async function getWorkspaceInfo(context: NodeFilesystemToolContext): Promise<Record<string, unknown>> {
  const workspace = await getWorkspace(context);
  const repoMap = getRepoMap(workspace.rootPath);

  return {
    ok: true,
    workspaceName: context.workspaceName || path.basename(workspace.rootPath),
    workspacePath: workspace.rootPath,
    activeFile: context.activeFile || null,
    activeLanguage: context.activeLanguage || null,
    repoMap: {
      packageManager: repoMap.packageManager,
      packageName: repoMap.packageName,
      scripts: repoMap.scripts,
      configFiles: repoMap.configFiles,
      topLevelDirs: repoMap.topLevelDirs,
      verificationHints: repoMap.verificationHints,
      excerpt: repoMap.excerpt
    }
  };
}

async function listFiles(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const rawPath = String(args.path || '.');
  const resolved = await resolveWorkspacePath(context, rawPath, { allowMissing: false });
  const stat = await fs.promises.stat(resolved.absolutePath);
  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `list_files path must point to a workspace directory: ${rawPath}`, {
      path: rawPath
    });
  }

  const maxDepth = clampNumber(args.maxDepth, 2, 0, 8);
  const limit = clampNumber(args.limit, 200, 1, 1000);
  const entries: Array<{ path: string; type: string }> = [];

  await walkDirectory(resolved.absolutePath, '.', 0, maxDepth, limit, entries);

  return {
    ok: true,
    path: args.path || '.',
    entries,
    truncated: entries.length >= limit
  };
}

async function readFile(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const maxChars = clampNumber(args.maxChars, 200000, 1000, 2000000);
  const resolved = await resolveWorkspacePath(context, filePath, { allowMissing: false });
  const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');
  const truncated = content.length > maxChars;

  return {
    ok: true,
    path: filePath,
    content: truncated ? content.slice(0, maxChars) : content,
    truncated
  };
}

async function readFileRange(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const requestedStartLine = requireLineNumber(args.startLine, 'startLine');
  const requestedEndLine = requireLineNumber(args.endLine, 'endLine');

  if (requestedStartLine > requestedEndLine) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "startLine" must be less than or equal to "endLine".');
  }

  const resolved = await resolveWorkspacePath(context, filePath, { allowMissing: false });
  const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const totalLines = lines.length;
  const startLine = Math.min(Math.max(requestedStartLine, 1), totalLines);
  const rangeLimitedEndLine = Math.min(requestedEndLine, startLine + MAX_READ_FILE_RANGE_LINES - 1);
  const endLine = Math.min(Math.max(rangeLimitedEndLine, startLine), totalLines);

  return {
    ok: true,
    path: filePath,
    startLine,
    endLine,
    totalLines,
    content: lines.slice(startLine - 1, endLine).join('\n'),
    truncatedRange: startLine !== requestedStartLine || endLine !== requestedEndLine
  };
}

async function outlineFile(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (context.outlineFile) {
    return context.outlineFile(args, context);
  }

  const filePath = requireString(args.path, 'path');
  const resolved = await resolveWorkspacePath(context, filePath, { allowMissing: false });
  const stat = await fs.promises.stat(resolved.absolutePath);
  if (!stat.isFile()) {
    throw createToolError('INVALID_ARGUMENT', `outline_file path must point to a workspace file: ${filePath}`, {
      path: filePath
    });
  }

  return {
    ok: false,
    code: 'INVALID_ARGUMENT',
    path: filePath,
    symbols: [],
    unsupported: true,
    error:
      'outline_file requires a host document-symbol capability. The Node filesystem tools core does not provide symbols yet.'
  };
}

async function grepSearch(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const query = requireString(args.query, 'query');
  const searchPath = String(args.path || '.');
  const include = typeof args.include === 'string' && args.include.trim() ? args.include.trim() : '**/*';
  const caseSensitive = Boolean(args.caseSensitive);
  const useRegex = Boolean(args.regex);
  const contextLines = clampNumber(args.contextLines, 0, 0, 5);
  const beforeLines = clampNumber(args.beforeLines, contextLines, 0, 5);
  const afterLines = clampNumber(args.afterLines, contextLines, 0, 5);
  const filesOnly = Boolean(args.filesOnly);
  const countOnly = Boolean(args.countOnly) && !filesOnly;
  const excludePatterns = getAdditionalExcludePatterns(args.exclude);
  const maxResults = clampNumber(args.maxResults, 100, 1, 1000);
  const maxFiles = clampNumber(args.maxFiles, 2000, 1, 10000);
  const workspace = await getWorkspace(context);
  const base = await resolveWorkspacePath(context, searchPath, { allowMissing: false });
  const searchFiles = await getSearchFiles(workspace, base, include, maxFiles);
  const matcher = createLineMatcher(query, useRegex, caseSensitive);
  const matches: SearchMatch[] = [];
  let searchedFiles = 0;
  let totalMatches = 0;

  for (const filePath of searchFiles.files) {
    if (matches.length >= maxResults) {
      break;
    }

    const relativePath = toWorkspaceRelativePath(workspace.rootPath, filePath);
    if (shouldSkipRelativePath(relativePath, excludePatterns)) {
      continue;
    }

    const content = await readTextFileForSearch(filePath);
    if (content === undefined) {
      continue;
    }

    searchedFiles += 1;
    const lines = content.split(/\r?\n/);
    let fileMatchCount = 0;

    for (let index = 0; index < lines.length; index += 1) {
      if (!filesOnly && !countOnly && matches.length >= maxResults) {
        break;
      }

      const column = matcher(lines[index]);
      if (column === undefined) {
        continue;
      }

      fileMatchCount += 1;
      totalMatches += 1;

      if (filesOnly) {
        matches.push({ path: relativePath });
        break;
      }

      if (countOnly) {
        continue;
      }

      const match: SearchMatch = {
        path: relativePath,
        line: index + 1,
        column: column + 1,
        text: trimSearchLine(lines[index])
      };

      if (beforeLines > 0) {
        match.before = lines.slice(Math.max(0, index - beforeLines), index).map(trimSearchLine);
      }

      if (afterLines > 0) {
        match.after = lines.slice(index + 1, index + 1 + afterLines).map(trimSearchLine);
      }

      matches.push(match);
    }

    if (countOnly && fileMatchCount > 0) {
      matches.push({ path: relativePath, count: fileMatchCount });
    }
  }

  return {
    ok: true,
    query,
    path: searchPath,
    include,
    exclude: excludePatterns,
    regex: useRegex,
    caseSensitive,
    filesOnly,
    countOnly,
    beforeLines,
    afterLines,
    filesInspected: searchedFiles,
    fileLimitReached: searchFiles.limitReached,
    ...(!filesOnly ? { totalMatches } : {}),
    matches,
    truncated: matches.length >= maxResults
  };
}

async function runBashScript(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const script = requireString(args.script, 'script');
  if (!script.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "script" must not be empty.', { argument: 'script' });
  }

  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const cwdPath = await resolveWorkspacePath(context, cwd, { allowMissing: false });
  const stat = await fs.promises.stat(cwdPath.absolutePath);
  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `cwd must point to a workspace directory: ${cwd}`, { cwd });
  }

  const timeoutMs = clampNumber(args.timeoutMs, 30000, 1000, 120000);
  const maxOutputChars = clampNumber(args.maxOutputChars, 200000, 1000, 1000000);
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', script], {
      cwd: cwdPath.absolutePath,
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let closed = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!closed) {
          child.kill('SIGKILL');
        }
      }, 1500).unref();
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      const next = appendOutput(stdout, chunk.toString('utf8'), maxOutputChars);
      stdout = next.text;
      stdoutTruncated ||= next.truncated;
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const next = appendOutput(stderr, chunk.toString('utf8'), maxOutputChars);
      stderr = next.text;
      stderrTruncated ||= next.truncated;
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        ...toStructuredToolFailure(error),
        ok: false,
        cwd,
        durationMs: Date.now() - startedAt
      });
    });

    child.on('close', (exitCode, signal) => {
      closed = true;
      clearTimeout(timeout);
      const ok = exitCode === 0 && !timedOut;
      resolve({
        ok,
        ...getProcessFailure(ok, timedOut, `Bash script timed out after ${timeoutMs}ms.`, exitCode, signal),
        cwd,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        stdoutTruncated,
        stderrTruncated
      });
    });

    timeout.unref();
  });
}

async function writeFile(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const content = requireString(args.content, 'content');
  const resolved = await resolveWorkspacePath(context, filePath, { allowMissing: true });
  const previousContent = await readFileIfExists(resolved.absolutePath);
  const changedRange = getChangedLineRange(previousContent || '', content);

  await fs.promises.mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  await fs.promises.writeFile(resolved.absolutePath, content, 'utf8');

  return {
    ok: true,
    path: filePath,
    bytes: Buffer.byteLength(content, 'utf8'),
    ...changedRange
  };
}

async function replaceInFile(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const search = requireString(args.search, 'search');
  const replace = requireString(args.replace, 'replace');
  const replaceAll = Boolean(args.all);
  const resolved = await resolveWorkspacePath(context, filePath, { allowMissing: false });
  const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');

  if (!content.includes(search)) {
    throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
  }

  const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
  const count = replaceAll ? content.split(search).length - 1 : 1;
  const changedRange = getChangedLineRange(content, nextContent);

  await fs.promises.writeFile(resolved.absolutePath, nextContent, 'utf8');

  return {
    ok: true,
    path: filePath,
    replacements: count,
    ...changedRange
  };
}

async function applyPatch(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const patch = requireString(args.patch, 'patch');
  const appliedPatch = await getAppliedPatch(context, patch);
  const written: AppliedPatch['files'] = [];

  try {
    for (const file of appliedPatch.files) {
      const resolved = await resolveWorkspacePath(context, file.path, { allowMissing: true });
      await fs.promises.mkdir(path.dirname(resolved.absolutePath), { recursive: true });
      await fs.promises.writeFile(resolved.absolutePath, file.newContent, 'utf8');
      written.push(file);
    }
  } catch (error) {
    await rollbackWrittenPatchFiles(context, written);
    throw error;
  }

  return createApplyPatchResult(appliedPatch);
}

async function createDirectory(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const dirPath = requireString(args.path, 'path');
  const resolved = await resolveWorkspacePath(context, dirPath, { allowMissing: true });

  await fs.promises.mkdir(resolved.absolutePath, { recursive: true });

  return {
    ok: true,
    path: dirPath
  };
}

async function deletePath(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const targetPath = requireString(args.path, 'path');
  const recursive = Boolean(args.recursive);
  const resolved = await resolveWorkspacePath(context, targetPath, { allowMissing: false });
  const stat = await fs.promises.lstat(resolved.absolutePath);

  if (stat.isDirectory() && !recursive) {
    throw createToolError('INVALID_ARGUMENT', `Directory deletion requires recursive=true: ${targetPath}`, {
      path: targetPath,
      recursive
    });
  }

  await fs.promises.rm(resolved.absolutePath, { recursive, force: false });

  return {
    ok: true,
    path: targetPath,
    recursive,
    trash: false
  };
}

async function getSearchFiles(
  workspace: Workspace,
  base: ResolvedWorkspacePath,
  include: string,
  maxFiles: number
): Promise<{ files: string[]; limitReached: boolean }> {
  const stat = await fs.promises.stat(base.absolutePath);

  if (stat.isFile()) {
    return { files: [base.absolutePath], limitReached: false };
  }

  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', 'grep_search path must point to a file or directory.');
  }

  const files: string[] = [];
  const basePath = base.absolutePath;
  let limitReached = false;

  const walk = async (directoryPath: string): Promise<void> => {
    if (files.length >= maxFiles) {
      limitReached = true;
      return;
    }

    const children = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));

    for (const child of children) {
      if (files.length >= maxFiles) {
        limitReached = true;
        return;
      }

      if (shouldSkipPath(child.name)) {
        continue;
      }

      const childPath = path.join(directoryPath, child.name);
      if (child.isDirectory()) {
        await walk(childPath);
        continue;
      }

      if (!child.isFile()) {
        continue;
      }

      const relativeToBase = toPosixPath(path.relative(basePath, childPath));
      const workspaceRelative = toWorkspaceRelativePath(workspace.rootPath, childPath);
      if (shouldSkipRelativePath(workspaceRelative) || !matchesGlob(relativeToBase, include)) {
        continue;
      }

      files.push(childPath);
    }
  };

  await walk(basePath);
  return { files, limitReached };
}

async function walkDirectory(
  directoryPath: string,
  relativeBase: string,
  depth: number,
  maxDepth: number,
  limit: number,
  entries: Array<{ path: string; type: string }>
): Promise<void> {
  if (entries.length >= limit) {
    return;
  }

  const children = await fs.promises.readdir(directoryPath, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name));

  for (const child of children) {
    if (entries.length >= limit) {
      return;
    }

    if (shouldSkipPath(child.name)) {
      continue;
    }

    const childRelative = relativeBase === '.' ? child.name : `${relativeBase}/${child.name}`;
    const isDirectory = child.isDirectory();
    entries.push({
      path: childRelative,
      type: isDirectory ? 'directory' : 'file'
    });

    if (isDirectory && depth < maxDepth) {
      await walkDirectory(path.join(directoryPath, child.name), childRelative, depth + 1, maxDepth, limit, entries);
    }
  }
}

async function getAppliedPatch(context: NodeFilesystemToolContext, patch: string): Promise<AppliedPatch> {
  const parsedFiles = parseUnifiedPatch(patch);
  const contentsByPath: Record<string, string | undefined> = {};

  for (const file of parsedFiles) {
    const resolved = await resolveWorkspacePath(context, file.path, { allowMissing: true });
    contentsByPath[file.path] = await readFileIfExists(resolved.absolutePath);
  }

  return applyUnifiedPatchToContents(patch, contentsByPath);
}

async function rollbackWrittenPatchFiles(
  context: NodeFilesystemToolContext,
  files: AppliedPatch['files']
): Promise<void> {
  for (const file of [...files].reverse()) {
    const resolved = await resolveWorkspacePath(context, file.path, { allowMissing: true });
    if (file.oldContent === undefined) {
      await fs.promises.rm(resolved.absolutePath, { force: true });
      continue;
    }

    await fs.promises.writeFile(resolved.absolutePath, file.oldContent, 'utf8');
  }
}

function createApplyPatchResult(appliedPatch: AppliedPatch): Record<string, unknown> {
  const files = appliedPatch.files.map(toPatchFileSummary);

  return {
    ok: true,
    files,
    changedFiles: files
  };
}

function toPatchFileSummary(file: AppliedPatch['files'][number]): Record<string, unknown> {
  return {
    path: file.path,
    created: file.created,
    bytes: Buffer.byteLength(file.newContent, 'utf8'),
    ...getChangedLineRange(file.oldContent || '', file.newContent)
  };
}

async function readTextFileForSearch(filePath: string): Promise<string | undefined> {
  const stat = await fs.promises.stat(filePath);
  if (stat.size > MAX_SEARCH_FILE_BYTES) {
    return undefined;
  }

  const bytes = await fs.promises.readFile(filePath);
  if (bytes.some((byte) => byte === 0)) {
    return undefined;
  }

  return bytes.toString('utf8');
}

async function readFileIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

async function resolveWorkspacePath(
  context: NodeFilesystemToolContext,
  relativePath: string,
  options: { allowMissing: boolean }
): Promise<ResolvedWorkspacePath> {
  const workspace = await getWorkspace(context);
  const normalizedRelativePath = normalizeWorkspaceRelativePath(relativePath);
  const absolutePath = path.resolve(workspace.rootPath, normalizedRelativePath === '.' ? '' : normalizedRelativePath);

  if (!isPathInsideOrSame(workspace.rootPath, absolutePath)) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${relativePath}`, {
      path: relativePath
    });
  }

  await assertRealPathInsideWorkspace(workspace.rootPath, absolutePath, relativePath, options.allowMissing);

  return {
    absolutePath,
    relativePath: normalizedRelativePath
  };
}

async function getWorkspace(context: NodeFilesystemToolContext): Promise<Workspace> {
  if (typeof context.workspaceRoot !== 'string' || !context.workspaceRoot.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'workspaceRoot must be a non-empty string.', {
      argument: 'workspaceRoot'
    });
  }

  const rootPath = path.resolve(context.workspaceRoot);
  const stat = await fs.promises.stat(rootPath);
  if (!stat.isDirectory()) {
    throw createToolError('NOT_A_DIRECTORY', `workspaceRoot must point to a directory: ${context.workspaceRoot}`, {
      workspaceRoot: context.workspaceRoot
    });
  }

  return {
    rootPath: await fs.promises.realpath(rootPath)
  };
}

function normalizeWorkspaceRelativePath(relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    throw createToolError('INVALID_ARGUMENT', 'Workspace-relative path must be a non-empty string.', {
      path: String(relativePath)
    });
  }

  if (relativePath.includes('\0')) {
    throw createToolError('INVALID_ARGUMENT', 'Workspace-relative path contains a null byte.', { path: relativePath });
  }

  if (
    path.isAbsolute(relativePath) ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    /^[A-Za-z]:/.test(relativePath)
  ) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path must be workspace-relative: ${relativePath}`, {
      path: relativePath
    });
  }

  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'));
  if (!normalized || normalized === '..' || normalized.startsWith('../')) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${relativePath}`, {
      path: relativePath
    });
  }

  return normalized;
}

async function assertRealPathInsideWorkspace(
  rootPath: string,
  absolutePath: string,
  inputPath: string,
  allowMissing: boolean
): Promise<void> {
  let missingError: unknown;
  try {
    const realPath = await fs.promises.realpath(absolutePath);
    if (!isPathInsideOrSame(rootPath, realPath)) {
      throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${inputPath}`, {
        path: inputPath
      });
    }
    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    missingError = error;
  }

  const nearestParent = await findNearestExistingParent(path.dirname(absolutePath));
  const realParent = await fs.promises.realpath(nearestParent);
  if (!isPathInsideOrSame(rootPath, realParent)) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Path is outside the workspace: ${inputPath}`, {
      path: inputPath
    });
  }

  if (!allowMissing) {
    throw missingError;
  }
}

async function findNearestExistingParent(startPath: string): Promise<string> {
  let currentPath = startPath;

  while (true) {
    try {
      const stat = await fs.promises.stat(currentPath);
      if (stat.isDirectory()) {
        return currentPath;
      }
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return currentPath;
    }
    currentPath = parentPath;
  }
}

function shouldSkipPath(name: string): boolean {
  return name.startsWith('.aist-') || STANDARD_IGNORED_NAMES.has(name);
}

function shouldSkipRelativePath(relativePath: string, excludePatterns: string[] = []): boolean {
  return (
    relativePath.split('/').some(shouldSkipPath) ||
    excludePatterns.some((pattern) => matchesGlob(relativePath, pattern))
  );
}

function createLineMatcher(
  query: string,
  useRegex: boolean,
  caseSensitive: boolean
): (line: string) => number | undefined {
  if (useRegex) {
    const flags = caseSensitive ? '' : 'i';
    let regex: RegExp;
    try {
      regex = new RegExp(query, flags);
    } catch (error) {
      throw createToolError('INVALID_ARGUMENT', `Invalid grep_search regex: ${getErrorMessage(error)}`, { query });
    }
    return (line) => {
      const match = regex.exec(line);
      return match ? match.index : undefined;
    };
  }

  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  return (line) => {
    const haystack = caseSensitive ? line : line.toLocaleLowerCase();
    const index = haystack.indexOf(needle);
    return index === -1 ? undefined : index;
  };
}

function trimSearchLine(line: string): string {
  return line.length > 500 ? `${line.slice(0, 500)}...` : line;
}

function appendOutput(current: string, chunk: string, maxChars: number): { text: string; truncated: boolean } {
  const next = current + chunk;
  if (next.length <= maxChars) {
    return { text: next, truncated: false };
  }

  return {
    text: next.slice(0, maxChars),
    truncated: true
  };
}

function getProcessFailure(
  ok: boolean,
  timedOut: boolean,
  timeoutError: string,
  exitCode: number | null,
  signal: NodeJS.Signals | null
): Record<string, unknown> {
  if (ok) {
    return {};
  }

  if (timedOut) {
    return {
      code: 'TIMEOUT',
      error: timeoutError
    };
  }

  return {
    code: 'INVALID_ARGUMENT',
    error:
      exitCode === null
        ? `Bash script exited without an exit code${signal ? ` after signal ${signal}` : ''}.`
        : `Bash script exited with code ${exitCode}.`
  };
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a string.`, { argument: name });
  }

  return value;
}

function requireLineNumber(value: unknown, name: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a finite number.`, {
      argument: name
    });
  }

  return Math.floor(numeric);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

function getAdditionalExcludePatterns(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const pattern = value.trim();
  return pattern ? expandGlobAlternatives(pattern) : [];
}

function expandGlobAlternatives(pattern: string): string[] {
  const trimmed = pattern.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [trimmed];
  }

  const body = trimmed.slice(1, -1);
  const alternatives: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of body) {
    if (char === '{') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      current += char;
      continue;
    }

    if (char === ',' && depth === 0) {
      if (current.trim()) {
        alternatives.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    alternatives.push(current.trim());
  }

  return alternatives;
}

function matchesGlob(relativePath: string, pattern: string): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalizedPattern) {
    return false;
  }

  return expandGlobAlternatives(normalizedPattern).some((alternative) => {
    const regex = globToRegExp(alternative);
    if (regex.test(normalizedPath)) {
      return true;
    }

    return !alternative.includes('/') && regex.test(path.basename(normalizedPath));
  });
}

function globToRegExp(pattern: string): RegExp {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    const afterNext = pattern[index + 2];

    if (char === '*' && next === '*' && afterNext === '/') {
      source += '(?:.*/)?';
      index += 2;
      continue;
    }

    if (char === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegExp(char);
  }

  source += '$';
  return new RegExp(source);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function getChangedLineRange(beforeContent: string, afterContent: string): Record<string, number> {
  if (beforeContent === afterContent) {
    return {};
  }

  const beforeLines = beforeContent.split(/\r?\n/);
  const afterLines = afterContent.split(/\r?\n/);
  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
    start += 1;
  }

  let beforeEnd = beforeLines.length - 1;
  let afterEnd = afterLines.length - 1;
  while (beforeEnd >= start && afterEnd >= start && beforeLines[beforeEnd] === afterLines[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const changedStartLine = start + 1;
  const changedEndLine = Math.max(changedStartLine, afterEnd + 1);
  return {
    changedStartLine,
    changedStartColumn: 1,
    changedEndLine,
    changedEndColumn: afterLines[changedEndLine - 1]?.length + 1 || 1
  };
}

function toWorkspaceRelativePath(rootPath: string, absolutePath: string): string {
  return toPosixPath(path.relative(rootPath, absolutePath));
}

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function isPathInsideOrSame(rootPath: string, filePath: string): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function isNotFoundError(error: unknown): boolean {
  return (
    error !== null && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT'
  );
}
