import type { ChatMessage } from '../../shared/types';
import { arrayValue, asRecord, asString, getToolPreview, getToolResult } from './toolValue';

export type ToolTone = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate';

export type FileReference = {
  path: string;
  line?: number;
  column?: number;
  label?: string;
};

export type ToolDisplayModel = {
  action: string;
  title: string;
  tone: ToolTone;
  primaryFile?: FileReference;
  files: FileReference[];
  summary: string;
};

const TOOL_META: Record<string, { action: string; tone: ToolTone }> = {
  get_workspace_info: { action: 'WORKSPACE INFO', tone: 'slate' },
  list_files: { action: 'LIST FILES', tone: 'blue' },
  read_file: { action: 'READ FILE', tone: 'green' },
  grep_search: { action: 'GREP SEARCH', tone: 'purple' },
  run_bash_script: { action: 'RUN BASH', tone: 'slate' },
  run_skill: { action: 'RUN SKILL', tone: 'green' },
  write_file: { action: 'WRITE FILE', tone: 'amber' },
  replace_in_file: { action: 'REPLACE IN FILE', tone: 'cyan' },
  create_directory: { action: 'CREATE DIRECTORY', tone: 'blue' },
  delete_path: { action: 'DELETE PATH', tone: 'rose' }
};

/**
 * Что это: нормализатор tool-сообщения в компактную модель для UI.
 * Зачем нужно: React-компоненты остаются простыми и не знают форму JSON каждого инструмента.
 * Пример: buildToolDisplayModel(message).title -> "READ FILE: src/index.ts".
 */
export function buildToolDisplayModel(message: ChatMessage): ToolDisplayModel {
  const meta = getToolMeta(message.name);
  const primaryFile = getPrimaryFileReference(message);
  const files = uniqueFiles(getAllFileReferences(message, primaryFile));
  const target = primaryFile?.path || getToolTarget(message) || '';

  return {
    action: meta.action,
    tone: meta.tone,
    primaryFile,
    files,
    title: target ? `${meta.action}: ${target}` : meta.action,
    summary: getShortSummary(message)
  };
}

function getToolMeta(name?: string): { action: string; tone: ToolTone } {
  return TOOL_META[name || ''] || { action: name || 'TOOL CALL', tone: 'slate' };
}

function getAllFileReferences(message: ChatMessage, primaryFile?: FileReference): FileReference[] {
  return [primaryFile, ...getResultFileReferences(message)].filter(Boolean) as FileReference[];
}

function getPrimaryFileReference(message: ChatMessage): FileReference | undefined {
  const argPath = asString(message.args?.path);
  if (argPath) return { path: argPath };

  const resultPath = asString(getToolResult(message)?.path) || asString(getToolPreview(message)?.path);
  return resultPath ? { path: resultPath } : undefined;
}

function getResultFileReferences(message: ChatMessage): FileReference[] {
  const result = getToolResult(message);
  const entries = arrayValue(result?.entries);
  const matches = arrayValue(result?.matches);

  return [...entries.map(fileFromPathValue), ...matches.map(fileFromSearchMatch)].filter(Boolean) as FileReference[];
}

function fileFromPathValue(value: unknown): FileReference | undefined {
  const item = asRecord(value);
  const filePath = asString(item?.path);
  return filePath ? { path: filePath, label: asString(item?.type) } : undefined;
}

function fileFromSearchMatch(value: unknown): FileReference | undefined {
  const item = asRecord(value);
  const filePath = asString(item?.path);
  if (!filePath) return undefined;

  return {
    path: filePath,
    line: typeof item?.line === 'number' ? item.line : undefined,
    column: typeof item?.column === 'number' ? item.column : undefined
  };
}

function getToolTarget(message: ChatMessage): string | undefined {
  if (message.name === 'run_bash_script') {
    return compactSingleLine(asString(message.args?.script));
  }

  if (message.name === 'run_skill') {
    return asString(message.args?.skillId) || asString(getToolResult(message)?.label);
  }

  return (
    asString(message.args?.query) ||
    asString(message.args?.path) ||
    asString(getToolResult(message)?.path) ||
    asString(getToolPreview(message)?.path)
  );
}

function getShortSummary(message: ChatMessage): string {
  const result = getToolResult(message);
  if (!result && message.name === 'run_bash_script') return `cwd ${asString(message.args?.cwd) || '.'}`;
  if (!result && message.name === 'run_skill') return `skill ${asString(message.args?.skillId) || ''}`.trim();
  if (!result) return message.status || 'tool';
  if (asString(result.error)) return asString(result.error) || 'Ошибка инструмента';
  if (message.name === 'grep_search') return `${arrayValue(result.matches).length} matches`;
  if (message.name === 'run_bash_script') return getBashSummary(result);
  if (message.name === 'run_skill') return getBashSummary(result);
  if (message.name === 'list_files') return `${arrayValue(result.entries).length} entries`;
  if (message.name === 'replace_in_file') return `${Number(result.replacements || 0)} replacements`;
  if (message.name === 'write_file' && typeof result.bytes === 'number') return `${result.bytes} bytes`;
  return message.status || 'tool';
}

function getBashSummary(result: Record<string, unknown>): string {
  const exitLabel = result.timedOut ? 'timed out' : `exit ${String(result.exitCode ?? 'unknown')}`;
  const durationLabel = typeof result.durationMs === 'number' ? ` · ${formatDuration(result.durationMs)}` : '';

  return `${exitLabel}${durationLabel}`;
}

function compactSingleLine(value?: string): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;

  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.round(durationMs / 1000)}s`;
}

function uniqueFiles(files: FileReference[]): FileReference[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.path}:${file.line || 0}:${file.column || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
