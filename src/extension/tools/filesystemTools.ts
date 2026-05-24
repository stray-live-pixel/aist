import { spawn } from 'node:child_process';
import path from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import * as vscode from 'vscode';

import type { OpenRouterTool } from '../openrouter/types';
import { getWorkspaceFolder, resolveWorkspacePath } from '../shared/workspace';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export type FilesystemToolPreview = {
  preview: Record<string, unknown>;
  cleanup(): Promise<void>;
};

export const filesystemTools: OpenRouterTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_workspace_info',
      description: 'Get the current VS Code workspace folder and active editor metadata.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'A short explanation of why this tool call is needed.'
          }
        },
        required: ['reason'],
        additionalProperties: false
      }
    }
  },
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
          maxChars: { type: 'number', description: 'Maximum characters to return. Default is 20000.' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  },
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
          maxResults: { type: 'number', description: 'Maximum number of matches to return. Default is 100.' },
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
        'Run a Bash script from inside the workspace. Use for tests, builds, git-safe inspections, and shell-based diagnostics.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this script needs to run.' },
          script: { type: 'string', description: 'Bash script to execute with bash -lc.' },
          cwd: { type: 'string', description: 'Workspace-relative directory to run in. Default is ".".' },
          timeoutMs: { type: 'number', description: 'Timeout in milliseconds. Default is 30000, maximum is 120000.' },
          maxOutputChars: {
            type: 'number',
            description: 'Maximum stdout/stderr characters to return per stream. Default is 20000.'
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
      description: 'Delete a workspace file or directory. Directories require recursive=true.',
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

export async function runFilesystemTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'list_files':
      return listFiles(args);
    case 'read_file':
      return readFile(args);
    case 'grep_search':
      return grepSearch(args);
    case 'run_bash_script':
      return runBashScript(args);
    case 'write_file':
      return writeFile(args);
    case 'replace_in_file':
      return replaceInFile(args);
    case 'create_directory':
      return createDirectory(args);
    case 'delete_path':
      return deletePath(args);
    case 'get_workspace_info':
      return getWorkspaceInfo();
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export async function previewFilesystemTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<FilesystemToolPreview | undefined> {
  if (toolName === 'write_file') {
    const filePath = requireString(args.path, 'path');
    const nextContent = requireString(args.content, 'content');
    return showFileDiff(filePath, nextContent);
  }

  if (toolName === 'replace_in_file') {
    const filePath = requireString(args.path, 'path');
    const search = requireString(args.search, 'search');
    const replace = requireString(args.replace, 'replace');
    const replaceAll = Boolean(args.all);
    const uri = resolveWorkspacePath(filePath);
    const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));

    if (!content.includes(search)) {
      throw new Error(`Text was not found in ${filePath}.`);
    }

    const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
    return showFileDiff(filePath, nextContent);
  }

  return undefined;
}

function getWorkspaceInfo(): Record<string, unknown> {
  const folder = getWorkspaceFolder();
  const editor = vscode.window.activeTextEditor;

  return {
    ok: true,
    workspaceName: folder.name,
    workspacePath: folder.uri.fsPath,
    activeFile: editor ? editor.document.fileName : null,
    activeLanguage: editor ? editor.document.languageId : null
  };
}

async function listFiles(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const uri = resolveWorkspacePath(String(args.path || '.'));
  const maxDepth = clampNumber(args.maxDepth, 2, 0, 8);
  const limit = clampNumber(args.limit, 200, 1, 1000);
  const entries: Array<{ path: string; type: string }> = [];

  await walkDirectory(uri, '.', 0, maxDepth, limit, entries);

  return {
    ok: true,
    path: args.path || '.',
    entries,
    truncated: entries.length >= limit
  };
}

async function readFile(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const maxChars = clampNumber(args.maxChars, 20000, 1000, 200000);
  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  const truncated = content.length > maxChars;

  return {
    ok: true,
    path: filePath,
    content: truncated ? content.slice(0, maxChars) : content,
    truncated
  };
}

async function grepSearch(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const query = requireString(args.query, 'query');
  const searchPath = String(args.path || '.');
  const include = typeof args.include === 'string' && args.include.trim() ? args.include.trim() : '**/*';
  const caseSensitive = Boolean(args.caseSensitive);
  const useRegex = Boolean(args.regex);
  const contextLines = clampNumber(args.contextLines, 0, 0, 5);
  const maxResults = clampNumber(args.maxResults, 100, 1, 1000);
  const maxFiles = clampNumber(args.maxFiles, 2000, 1, 10000);
  const baseUri = resolveWorkspacePath(searchPath);
  const files = await getSearchFiles(baseUri, include, maxFiles);
  const matcher = createLineMatcher(query, useRegex, caseSensitive);
  const matches: Array<{
    path: string;
    line: number;
    column: number;
    text: string;
    before?: string[];
    after?: string[];
  }> = [];
  let searchedFiles = 0;

  for (const file of files) {
    if (matches.length >= maxResults) {
      break;
    }

    const relativePath = toWorkspaceRelativePath(file);
    if (shouldSkipRelativePath(relativePath)) {
      continue;
    }

    const content = await readTextFileForSearch(file);
    if (content === undefined) {
      continue;
    }

    searchedFiles += 1;
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length && matches.length < maxResults; index += 1) {
      const column = matcher(lines[index]);
      if (column === undefined) {
        continue;
      }

      const match: {
        path: string;
        line: number;
        column: number;
        text: string;
        before?: string[];
        after?: string[];
      } = {
        path: relativePath,
        line: index + 1,
        column: column + 1,
        text: trimSearchLine(lines[index])
      };

      if (contextLines > 0) {
        match.before = lines.slice(Math.max(0, index - contextLines), index).map(trimSearchLine);
        match.after = lines.slice(index + 1, index + 1 + contextLines).map(trimSearchLine);
      }

      matches.push(match);
    }
  }

  return {
    ok: true,
    query,
    path: searchPath,
    include,
    regex: useRegex,
    caseSensitive,
    filesInspected: searchedFiles,
    fileLimitReached: files.length >= maxFiles,
    matches,
    truncated: matches.length >= maxResults
  };
}

async function runBashScript(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const script = requireString(args.script, 'script');
  if (!script.trim()) {
    throw new Error('Tool argument "script" must not be empty.');
  }

  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const cwdUri = resolveWorkspacePath(cwd);
  const stat = await vscode.workspace.fs.stat(cwdUri);
  if (stat.type !== vscode.FileType.Directory) {
    throw new Error(`cwd must point to a workspace directory: ${cwd}`);
  }

  const timeoutMs = clampNumber(args.timeoutMs, 30000, 1000, 120000);
  const maxOutputChars = clampNumber(args.maxOutputChars, 20000, 1000, 100000);
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', script], {
      cwd: cwdUri.fsPath,
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
        ok: false,
        cwd,
        error: getErrorText(error),
        durationMs: Date.now() - startedAt
      });
    });

    child.on('close', (exitCode, signal) => {
      closed = true;
      clearTimeout(timeout);
      resolve({
        ok: exitCode === 0 && !timedOut,
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

async function writeFile(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const content = requireString(args.content, 'content');
  const uri = resolveWorkspacePath(filePath);

  await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(content));

  return {
    ok: true,
    path: filePath,
    bytes: Buffer.byteLength(content, 'utf8')
  };
}

async function replaceInFile(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const search = requireString(args.search, 'search');
  const replace = requireString(args.replace, 'replace');
  const replaceAll = Boolean(args.all);
  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));

  if (!content.includes(search)) {
    throw new Error(`Text was not found in ${filePath}.`);
  }

  const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
  const count = replaceAll ? content.split(search).length - 1 : 1;

  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(nextContent));

  return {
    ok: true,
    path: filePath,
    replacements: count
  };
}

async function createDirectory(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const dirPath = requireString(args.path, 'path');
  const uri = resolveWorkspacePath(dirPath);

  await vscode.workspace.fs.createDirectory(uri);

  return {
    ok: true,
    path: dirPath
  };
}

async function deletePath(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const targetPath = requireString(args.path, 'path');
  const uri = resolveWorkspacePath(targetPath);

  await vscode.workspace.fs.delete(uri, {
    recursive: Boolean(args.recursive),
    useTrash: true
  });

  return {
    ok: true,
    path: targetPath,
    recursive: Boolean(args.recursive)
  };
}

async function getSearchFiles(baseUri: vscode.Uri, include: string, maxFiles: number): Promise<vscode.Uri[]> {
  const stat = await vscode.workspace.fs.stat(baseUri);

  if (stat.type === vscode.FileType.File) {
    return [baseUri];
  }

  if (stat.type !== vscode.FileType.Directory) {
    throw new Error('grep_search path must point to a file or directory.');
  }

  return vscode.workspace.findFiles(
    new vscode.RelativePattern(baseUri, include),
    '{**/.git/**,**/node_modules/**,**/dist/**,**/out/**,**/.vscode-test/**}',
    maxFiles
  );
}

async function showFileDiff(filePath: string, nextContent: string): Promise<FilesystemToolPreview> {
  const targetUri = resolveWorkspacePath(filePath);
  const currentContent = await readFileIfExists(targetUri);

  if (currentContent === nextContent) {
    return {
      preview: {
        ok: true,
        path: filePath,
        diffShown: false,
        reason: 'No file changes to preview.'
      },
      cleanup: async () => {}
    };
  }

  const previewRoot = await getDiffPreviewRoot(targetUri);
  const originalUri = currentContent === undefined ? getDiffPreviewUri(previewRoot, filePath, 'empty') : targetUri;
  const proposedUri = getDiffPreviewUri(previewRoot, filePath, 'proposed');
  const cleanupUris = currentContent === undefined ? [originalUri, proposedUri] : [proposedUri];

  try {
    if (currentContent === undefined) {
      await vscode.workspace.fs.writeFile(originalUri, textEncoder.encode(''));
    }
    await vscode.workspace.fs.writeFile(proposedUri, textEncoder.encode(nextContent));

    await vscode.commands.executeCommand('vscode.diff', originalUri, proposedUri, `aist Preview: ${filePath}`, {
      preview: true
    });
  } catch (error) {
    await cleanupDiffPreviewFiles(cleanupUris);
    throw error;
  }

  return {
    preview: {
      ok: true,
      path: filePath,
      diffShown: true
    },
    cleanup: () => cleanupDiffPreviewFiles(cleanupUris)
  };
}

async function cleanupDiffPreviewFiles(uris: vscode.Uri[]): Promise<void> {
  await Promise.all(uris.map(deleteDiffPreviewFile));
}

async function deleteDiffPreviewFile(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri, { recursive: false, useTrash: false });
  } catch {
    // Preview cleanup is best-effort and should not mask the tool result.
  }
}

async function getDiffPreviewRoot(targetUri: vscode.Uri): Promise<vscode.Uri> {
  const root = vscode.Uri.file(path.dirname(targetUri.fsPath));
  await vscode.workspace.fs.createDirectory(root);
  return root;
}

function getDiffPreviewUri(root: vscode.Uri, filePath: string, prefix: 'empty' | 'proposed'): vscode.Uri {
  const parsedPath = path.parse(path.basename(filePath) || 'file');
  const safeName = parsedPath.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return vscode.Uri.joinPath(root, `.aist-${prefix}-${Date.now()}-${safeName}${parsedPath.ext}`);
}

async function readFileIfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  } catch (error) {
    if (error instanceof vscode.FileSystemError) {
      return undefined;
    }
    return undefined;
  }
}

async function walkDirectory(
  uri: vscode.Uri,
  relativeBase: string,
  depth: number,
  maxDepth: number,
  limit: number,
  entries: Array<{ path: string; type: string }>
): Promise<void> {
  if (entries.length >= limit) {
    return;
  }

  const children = await vscode.workspace.fs.readDirectory(uri);
  children.sort(([a], [b]) => a.localeCompare(b));

  for (const [name, type] of children) {
    if (entries.length >= limit) {
      return;
    }

    if (shouldSkipPath(name)) {
      continue;
    }

    const childRelative = relativeBase === '.' ? name : `${relativeBase}/${name}`;
    const isDirectory = type === vscode.FileType.Directory;
    entries.push({
      path: childRelative,
      type: isDirectory ? 'directory' : 'file'
    });

    if (isDirectory && depth < maxDepth) {
      await walkDirectory(vscode.Uri.joinPath(uri, name), childRelative, depth + 1, maxDepth, limit, entries);
    }
  }
}

function shouldSkipPath(name: string): boolean {
  return name.startsWith('.aist-') || ['.git', 'node_modules', 'dist', 'out', '.vscode-test'].includes(name);
}

function shouldSkipRelativePath(relativePath: string): boolean {
  return relativePath.split('/').some(shouldSkipPath);
}

function toWorkspaceRelativePath(uri: vscode.Uri): string {
  const folder = getWorkspaceFolder();
  return path.relative(folder.uri.fsPath, uri.fsPath).replace(/\\/g, '/');
}

async function readTextFileForSearch(uri: vscode.Uri): Promise<string | undefined> {
  const stat = await vscode.workspace.fs.stat(uri);
  if (stat.size > 1024 * 1024) {
    return undefined;
  }

  const bytes = await vscode.workspace.fs.readFile(uri);
  if (bytes.some((byte) => byte === 0)) {
    return undefined;
  }

  return textDecoder.decode(bytes);
}

function createLineMatcher(
  query: string,
  useRegex: boolean,
  caseSensitive: boolean
): (line: string) => number | undefined {
  if (useRegex) {
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(query, flags);
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

function getErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Tool argument "${name}" must be a string.`);
  }

  return value;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numeric)));
}
