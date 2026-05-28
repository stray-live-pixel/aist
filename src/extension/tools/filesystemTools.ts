import { spawn } from 'node:child_process';
import path from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import * as vscode from 'vscode';

import type { OpenRouterTool } from '../../core/types';
import { getRepoMap } from '../shared/repoMap';
import { createToolError, toStructuredToolFailure } from '../shared/toolErrors';
import { getWorkspaceFolder, resolveWorkspacePath } from '../shared/workspace';
import { type AppliedPatch, applyUnifiedPatchToContents, parseUnifiedPatch } from './applyPatch';
import { showEditableFileDiff } from './editableDiffPreview';
import { type SemanticEditPlan, changedRangesFromLineRange, selectSemanticEdit } from './semanticEdit';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');
const MAX_READ_FILE_RANGE_LINES = 400;
const DEFAULT_OUTLINE_SYMBOL_LIMIT = 200;
const DEFAULT_OUTLINE_DEPTH = 4;
const GREP_SEARCH_DEFAULT_EXCLUDE = '{**/.git/**,**/node_modules/**,**/dist/**,**/out/**,**/.vscode-test/**}';

type OutlineSymbol = {
  name: string;
  kind: string;
  line: number;
  endLine: number;
  children?: OutlineSymbol[];
};

export type FilesystemToolPreview = {
  preview: Record<string, unknown>;
  approve(): Promise<Record<string, unknown>>;
  cleanup(): Promise<void>;
};

export const filesystemTools: OpenRouterTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_workspace_info',
      description:
        'Get the current VS Code workspace folder, active editor metadata, and a compact on-demand repo map with verification hints.',
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
      name: 'outline_file',
      description:
        'Return a compact symbol outline for a workspace file using VS Code document symbols. Use this before reading large TypeScript, React, or other language-server-backed files.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative file path.' },
          maxDepth: {
            type: 'number',
            description: `Maximum symbol nesting depth. Default is ${DEFAULT_OUTLINE_DEPTH}.`
          },
          maxSymbols: {
            type: 'number',
            description: `Maximum number of symbols to return across the outline. Default is ${DEFAULT_OUTLINE_SYMBOL_LIMIT}.`
          }
        },
        required: ['reason', 'path'],
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
      description:
        'Read a UTF-8 text file from the workspace. Prefer read_file_range when you already know the needed line range.',
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
      name: 'read_file_range',
      description:
        'Read an inclusive 1-based line range from a UTF-8 workspace file. Use this after grep_search when line numbers are known.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative file path.' },
          startLine: { type: 'number', description: 'Inclusive 1-based start line.' },
          endLine: {
            type: 'number',
            description: `Inclusive 1-based end line. At most ${MAX_READ_FILE_RANGE_LINES} lines are returned.`
          }
        },
        required: ['reason', 'path', 'startLine', 'endLine'],
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
      description:
        'Replace text in an existing UTF-8 file. If this returns code TEXT_NOT_FOUND, read_file_range around the expected location before retrying.',
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
      name: 'edit_file',
      description:
        'Request a semantic single-file edit. Provide intent in instructions and a compact expectedChange object; the runtime reads the current file, selects exact replace, unified patch, or small-file rewrite, opens an approval preview, and reports changed ranges and diagnostics.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
          path: { type: 'string', description: 'Workspace-relative file path.' },
          strategy: {
            type: 'string',
            enum: ['auto', 'exact_replace', 'patch', 'rewrite'],
            description: 'Preferred edit primitive. Use auto unless a specific primitive is required.'
          },
          instructions: {
            type: 'string',
            description: 'Human-readable edit intent and constraints for the approval preview.'
          },
          expectedChange: {
            type: 'object',
            description:
              'Compact concrete change. For exact_replace use search plus replacement. For patch use patch as a unified diff for this path. For rewrite use content/newContent/fullContent; large rewrites require explicitLargeRewriteApproval=true.',
            properties: {
              search: { type: 'string', description: 'Exact text expected in the current file.' },
              replacement: { type: 'string', description: 'Replacement text for search.' },
              replace: { type: 'string', description: 'Alias for replacement.' },
              all: { type: 'boolean', description: 'Replace all exact matches when using search/replacement.' },
              patch: { type: 'string', description: 'Unified diff patch that modifies only path.' },
              content: { type: 'string', description: 'Full expected file content for small-file rewrite.' },
              newContent: { type: 'string', description: 'Alias for content.' },
              fullContent: { type: 'string', description: 'Alias for content.' },
              explicitLargeRewriteApproval: {
                type: 'boolean',
                description: 'Required to preview a full rewrite of a large file.'
              }
            },
            additionalProperties: true
          }
        },
        required: ['reason', 'path', 'strategy', 'instructions', 'expectedChange'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'apply_patch',
      description:
        'Apply a unified diff patch to one or more UTF-8 workspace files. Use this for multi-location edits or when exact large replace_in_file blocks would be brittle.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this patch is needed.' },
          patch: {
            type: 'string',
            description:
              'Unified diff patch for workspace-relative files. Binary patches, path traversal, file deletion, and renames are rejected.'
          }
        },
        required: ['reason', 'patch'],
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
  try {
    switch (toolName) {
      case 'list_files':
        return await listFiles(args);
      case 'read_file':
        return await readFile(args);
      case 'read_file_range':
        return await readFileRange(args);
      case 'outline_file':
        return await outlineFile(args);
      case 'grep_search':
        return await grepSearch(args);
      case 'run_bash_script':
        return await runBashScript(args);
      case 'write_file':
        return await writeFile(args);
      case 'replace_in_file':
        return await replaceInFile(args);
      case 'edit_file':
        return await editFile(args);
      case 'apply_patch':
        return await applyPatch(args);
      case 'create_directory':
        return await createDirectory(args);
      case 'delete_path':
        return await deletePath(args);
      case 'get_workspace_info':
        return getWorkspaceInfo();
      default:
        throw createToolError('INVALID_ARGUMENT', `Unknown tool: ${toolName}`, { toolName });
    }
  } catch (error) {
    return toStructuredToolFailure(error);
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
      throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
    }

    const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
    const generatedReplacements = replaceAll ? content.split(search).length - 1 : 1;
    return showFileDiff(filePath, nextContent, generatedReplacements);
  }

  if (toolName === 'edit_file') {
    const plan = await getSemanticEditPlan(args);
    return showSemanticEditDiff(plan);
  }

  if (toolName === 'apply_patch') {
    const patch = requireString(args.patch, 'patch');
    const appliedPatch = await getAppliedPatch(patch);
    return showPatchDiff(appliedPatch);
  }

  return undefined;
}

function getWorkspaceInfo(): Record<string, unknown> {
  const folder = getWorkspaceFolder();
  const editor = vscode.window.activeTextEditor;
  const repoMap = getRepoMap(folder.uri.fsPath);

  return {
    ok: true,
    workspaceName: folder.name,
    workspacePath: folder.uri.fsPath,
    activeFile: editor ? editor.document.fileName : null,
    activeLanguage: editor ? editor.document.languageId : null,
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

async function listFiles(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const rawPath = String(args.path || '.');
  const uri = resolveWorkspacePath(rawPath);
  const stat = await vscode.workspace.fs.stat(uri);
  if (stat.type !== vscode.FileType.Directory) {
    throw createToolError('NOT_A_DIRECTORY', `list_files path must point to a workspace directory: ${rawPath}`, {
      path: rawPath
    });
  }
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

async function readFileRange(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const requestedStartLine = requireLineNumber(args.startLine, 'startLine');
  const requestedEndLine = requireLineNumber(args.endLine, 'endLine');

  if (requestedStartLine > requestedEndLine) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "startLine" must be less than or equal to "endLine".');
  }

  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));
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

async function outlineFile(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const maxDepth = clampNumber(args.maxDepth, DEFAULT_OUTLINE_DEPTH, 1, 10);
  const maxSymbols = clampNumber(args.maxSymbols, DEFAULT_OUTLINE_SYMBOL_LIMIT, 1, 1000);
  const uri = resolveWorkspacePath(filePath);
  const stat = await vscode.workspace.fs.stat(uri);

  if (stat.type !== vscode.FileType.File) {
    throw createToolError('INVALID_ARGUMENT', `outline_file path must point to a workspace file: ${filePath}`, {
      path: filePath
    });
  }

  let rawSymbols: Array<vscode.DocumentSymbol | vscode.SymbolInformation> | undefined;
  try {
    rawSymbols = await vscode.commands.executeCommand<Array<vscode.DocumentSymbol | vscode.SymbolInformation>>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );
  } catch (error) {
    return {
      ...toStructuredToolFailure(error),
      ok: false,
      path: filePath,
      symbols: []
    };
  }

  if (!rawSymbols?.length) {
    return {
      ok: false,
      code: 'INVALID_ARGUMENT',
      path: filePath,
      symbols: [],
      error: 'No document symbols were returned for this file.'
    };
  }

  const budget = { remaining: maxSymbols, truncated: false };
  const symbols = isDocumentSymbol(rawSymbols[0])
    ? convertDocumentSymbols(rawSymbols as vscode.DocumentSymbol[], maxDepth, budget, 1)
    : convertSymbolInformation(rawSymbols as vscode.SymbolInformation[], maxSymbols, budget);

  return {
    ok: true,
    path: filePath,
    symbols,
    symbolCount: maxSymbols - budget.remaining,
    maxDepth,
    maxSymbols,
    truncated: budget.truncated
  };
}

async function grepSearch(args: Record<string, unknown>): Promise<Record<string, unknown>> {
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
  const baseUri = resolveWorkspacePath(searchPath);
  const files = await getSearchFiles(baseUri, include, getFindFilesExclude(excludePatterns), maxFiles);
  const matcher = createLineMatcher(query, useRegex, caseSensitive);
  type SearchMatch = {
    path: string;
    line?: number;
    column?: number;
    text?: string;
    count?: number;
    before?: string[];
    after?: string[];
  };
  const matches: SearchMatch[] = [];
  let searchedFiles = 0;
  let totalMatches = 0;

  for (const file of files) {
    if (matches.length >= maxResults) {
      break;
    }

    const relativePath = toWorkspaceRelativePath(file);
    if (shouldSkipRelativePath(relativePath, excludePatterns)) {
      continue;
    }

    const content = await readTextFileForSearch(file);
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
    fileLimitReached: files.length >= maxFiles,
    ...(!filesOnly ? { totalMatches } : {}),
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
    throw createToolError('NOT_A_DIRECTORY', `cwd must point to a workspace directory: ${cwd}`, { cwd });
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

async function writeFile(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const filePath = requireString(args.path, 'path');
  const content = requireString(args.content, 'content');
  const uri = resolveWorkspacePath(filePath);
  const previousContent = await readFileIfExists(uri);
  const changedRange = getChangedLineRange(previousContent || '', content);

  await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(content));

  return {
    ok: true,
    path: filePath,
    bytes: Buffer.byteLength(content, 'utf8'),
    ...changedRange
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
    throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
  }

  const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
  const count = replaceAll ? content.split(search).length - 1 : 1;
  const changedRange = getChangedLineRange(content, nextContent);

  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(nextContent));

  return {
    ok: true,
    path: filePath,
    replacements: count,
    ...changedRange
  };
}

async function editFile(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const plan = await getSemanticEditPlan(args);
  const uri = resolveWorkspacePath(plan.path);

  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(plan.nextContent));

  return createSemanticEditResult(plan, {
    ok: true,
    path: plan.path,
    bytes: Buffer.byteLength(plan.nextContent, 'utf8'),
    ...getChangedLineRangeFromRanges(plan.changedRanges)
  });
}

async function applyPatch(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const patch = requireString(args.patch, 'patch');
  const appliedPatch = await getAppliedPatch(patch);
  const written: AppliedPatch['files'] = [];

  try {
    for (const file of appliedPatch.files) {
      const uri = resolveWorkspacePath(file.path);
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
      await vscode.workspace.fs.writeFile(uri, textEncoder.encode(file.newContent));
      written.push(file);
    }
  } catch (error) {
    await rollbackWrittenPatchFiles(written);
    throw error;
  }

  return createApplyPatchResult(appliedPatch);
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

async function getSearchFiles(
  baseUri: vscode.Uri,
  include: string,
  exclude: string,
  maxFiles: number
): Promise<vscode.Uri[]> {
  const stat = await vscode.workspace.fs.stat(baseUri);

  if (stat.type === vscode.FileType.File) {
    return [baseUri];
  }

  if (stat.type !== vscode.FileType.Directory) {
    throw createToolError('NOT_A_DIRECTORY', 'grep_search path must point to a file or directory.');
  }

  return vscode.workspace.findFiles(new vscode.RelativePattern(baseUri, include), exclude, maxFiles);
}

async function showFileDiff(
  filePath: string,
  nextContent: string,
  generatedReplacements?: number
): Promise<FilesystemToolPreview> {
  return showEditableFileDiff({ filePath, nextContent, generatedReplacements });
}

async function showSemanticEditDiff(plan: SemanticEditPlan): Promise<FilesystemToolPreview> {
  const preview = await showFileDiff(plan.path, plan.nextContent, plan.replacements);

  return {
    preview: {
      ...preview.preview,
      instructions: plan.instructions,
      strategyUsed: plan.strategyUsed,
      diagnostics: plan.diagnostics,
      changedRanges: plan.changedRanges
    },
    approve: async () => {
      const result = await preview.approve();
      return createSemanticEditResult(plan, result);
    },
    cleanup: async () => {
      await preview.cleanup();
    }
  };
}

async function showPatchDiff(appliedPatch: AppliedPatch): Promise<FilesystemToolPreview> {
  const previews: FilesystemToolPreview[] = [];

  try {
    for (const file of appliedPatch.files) {
      previews.push(await showFileDiff(file.path, file.newContent));
    }
  } catch (error) {
    await cleanupPatchPreviews(previews);
    throw error;
  }

  return {
    preview: {
      ok: true,
      diffShown: true,
      editable: true,
      files: appliedPatch.files.map(toPatchFileSummary)
    },
    approve: async () => {
      const files = [];
      for (const preview of previews) {
        files.push(await preview.approve());
      }

      return {
        ok: true,
        files,
        changedFiles: files
      };
    },
    cleanup: async () => {
      await cleanupPatchPreviews(previews);
    }
  };
}

async function cleanupPatchPreviews(previews: FilesystemToolPreview[]): Promise<void> {
  for (const preview of [...previews].reverse()) {
    await preview.cleanup();
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

function convertDocumentSymbols(
  symbols: vscode.DocumentSymbol[],
  maxDepth: number,
  budget: { remaining: number; truncated: boolean },
  depth: number
): OutlineSymbol[] {
  const outline: OutlineSymbol[] = [];

  for (const symbol of symbols) {
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }

    budget.remaining -= 1;
    const outlineSymbol: OutlineSymbol = {
      name: symbol.name,
      kind: getSymbolKindName(symbol.kind),
      line: symbol.range.start.line + 1,
      endLine: symbol.range.end.line + 1
    };

    if (symbol.children?.length) {
      if (depth < maxDepth) {
        const children = convertDocumentSymbols(symbol.children, maxDepth, budget, depth + 1);
        if (children.length) {
          outlineSymbol.children = children;
        }
      } else {
        budget.truncated = true;
      }
    }

    outline.push(outlineSymbol);
  }

  return outline;
}

function convertSymbolInformation(
  symbols: vscode.SymbolInformation[],
  maxSymbols: number,
  budget: { remaining: number; truncated: boolean }
): OutlineSymbol[] {
  const limited = symbols.slice(0, maxSymbols);
  budget.remaining -= limited.length;
  budget.truncated = symbols.length > limited.length;

  return limited.map((symbol) => ({
    name: symbol.name,
    kind: getSymbolKindName(symbol.kind),
    line: symbol.location.range.start.line + 1,
    endLine: symbol.location.range.end.line + 1
  }));
}

function isDocumentSymbol(symbol: vscode.DocumentSymbol | vscode.SymbolInformation): symbol is vscode.DocumentSymbol {
  return 'range' in symbol;
}

function getSymbolKindName(kind: vscode.SymbolKind): string {
  return vscode.SymbolKind[kind] || String(kind);
}

function shouldSkipPath(name: string): boolean {
  return name.startsWith('.aist-') || ['.git', 'node_modules', 'dist', 'out', '.vscode-test'].includes(name);
}

function shouldSkipRelativePath(relativePath: string, excludePatterns: string[] = []): boolean {
  return (
    relativePath.split('/').some(shouldSkipPath) ||
    excludePatterns.some((pattern) => matchesGlob(relativePath, pattern))
  );
}

function toWorkspaceRelativePath(uri: vscode.Uri): string {
  const folder = getWorkspaceFolder();
  return path.relative(folder.uri.fsPath, uri.fsPath).replace(/\\/g, '/');
}

async function readFileIfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

async function getAppliedPatch(patch: string): Promise<AppliedPatch> {
  const parsedFiles = parseUnifiedPatch(patch);
  const contentsByPath: Record<string, string | undefined> = {};

  for (const file of parsedFiles) {
    const uri = resolveWorkspacePath(file.path);
    contentsByPath[file.path] = await readFileIfExists(uri);
  }

  return applyUnifiedPatchToContents(patch, contentsByPath);
}

async function getSemanticEditPlan(args: Record<string, unknown>): Promise<SemanticEditPlan> {
  const filePath = requireString(args.path, 'path');
  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  return selectSemanticEdit(args, content);
}

async function rollbackWrittenPatchFiles(files: AppliedPatch['files']): Promise<void> {
  for (const file of [...files].reverse()) {
    const uri = resolveWorkspacePath(file.path);
    if (file.oldContent === undefined) {
      await vscode.workspace.fs.delete(uri, { recursive: false, useTrash: false });
      continue;
    }

    await vscode.workspace.fs.writeFile(uri, textEncoder.encode(file.oldContent));
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

function createSemanticEditResult(plan: SemanticEditPlan, result: Record<string, unknown>): Record<string, unknown> {
  const changedRanges = changedRangesFromLineRange(plan.path, result);

  return {
    ...result,
    instructions: plan.instructions,
    strategyUsed: plan.strategyUsed,
    diagnostics: plan.diagnostics,
    changedRanges: changedRanges.length ? changedRanges : plan.changedRanges,
    ...(plan.replacements === undefined ? {} : { replacements: plan.replacements })
  };
}

function getChangedLineRangeFromRanges(ranges: ReturnType<typeof changedRangesFromLineRange>): Record<string, number> {
  const range = ranges[0];
  if (!range) {
    return {};
  }

  return {
    changedStartLine: range.changedStartLine,
    changedStartColumn: range.changedStartColumn,
    changedEndLine: range.changedEndLine,
    changedEndColumn: range.changedEndColumn
  };
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
    let regex: RegExp;
    try {
      regex = new RegExp(query, flags);
    } catch (error) {
      throw createToolError('INVALID_ARGUMENT', `Invalid grep_search regex: ${getErrorText(error)}`, { query });
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

function getErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function getFindFilesExclude(excludePatterns: string[]): string {
  if (!excludePatterns.length) {
    return GREP_SEARCH_DEFAULT_EXCLUDE;
  }

  const defaults = expandGlobAlternatives(GREP_SEARCH_DEFAULT_EXCLUDE);
  return `{${[...defaults, ...excludePatterns].join(',')}}`;
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
