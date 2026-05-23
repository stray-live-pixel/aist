import path from 'node:path';
import os from 'node:os';
import { TextDecoder, TextEncoder } from 'node:util';
import * as vscode from 'vscode';
import type { OpenRouterTool } from '../openrouter/types';
import { getWorkspaceFolder, resolveWorkspacePath } from '../shared/workspace';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

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

export async function runFilesystemTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'list_files':
      return listFiles(args);
    case 'read_file':
      return readFile(args);
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

export async function previewFilesystemTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
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

async function showFileDiff(filePath: string, nextContent: string): Promise<Record<string, unknown>> {
  const targetUri = resolveWorkspacePath(filePath);
  const currentContent = await readFileIfExists(targetUri);

  if (currentContent === nextContent) {
    return {
      ok: true,
      path: filePath,
      diffShown: false,
      reason: 'No file changes to preview.'
    };
  }

  const tempRoot = vscode.Uri.file(path.join(os.tmpdir(), 'openrouter-ai-agent-diffs', Date.now().toString()));
  await vscode.workspace.fs.createDirectory(tempRoot);

  const originalUri = currentContent === undefined ? vscode.Uri.joinPath(tempRoot, `empty-${path.basename(filePath)}`) : targetUri;
  const proposedUri = vscode.Uri.joinPath(tempRoot, `proposed-${path.basename(filePath) || 'file'}`);

  if (currentContent === undefined) {
    await vscode.workspace.fs.writeFile(originalUri, textEncoder.encode(''));
  }
  await vscode.workspace.fs.writeFile(proposedUri, textEncoder.encode(nextContent));

  await vscode.commands.executeCommand(
    'vscode.diff',
    originalUri,
    proposedUri,
    `OpenRouter Agent Preview: ${filePath}`,
    { preview: true }
  );

  return {
    ok: true,
    path: filePath,
    diffShown: true
  };
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
  return ['.git', 'node_modules', 'dist', 'out', '.vscode-test'].includes(name);
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
