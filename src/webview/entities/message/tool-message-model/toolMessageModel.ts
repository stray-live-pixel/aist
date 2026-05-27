import type { useI18n } from '../../../shared/i18n';
import type { ChatMessage } from '../../../shared/types';
import { arrayValue, asRecord, asString, getToolPreview, getToolResult } from '../tool-value';
import type { FileReference, ToolDisplayModel, ToolTone } from './types';

type Translator = ReturnType<typeof useI18n>['t'];

/**
 * Метаданные каждого инструмента: ключ локализации и визуальный тон.
 * Новые инструменты добавляются сюда — UI подхватит автоматически.
 */
const TOOL_META: Record<string, { actionKey: Parameters<Translator>[0]; tone: ToolTone }> = {
  get_workspace_info: { actionKey: 'tool.action.get_workspace_info', tone: 'slate' },
  list_files: { actionKey: 'tool.action.list_files', tone: 'blue' },
  read_file: { actionKey: 'tool.action.read_file', tone: 'green' },
  read_file_range: { actionKey: 'tool.action.read_file_range', tone: 'green' },
  grep_search: { actionKey: 'tool.action.grep_search', tone: 'purple' },
  run_bash_script: { actionKey: 'tool.action.run_bash_script', tone: 'slate' },
  run_skill: { actionKey: 'tool.action.run_skill', tone: 'green' },
  compact_chat: { actionKey: 'tool.action.compact_chat', tone: 'purple' },
  create_plan: { actionKey: 'tool.action.create_plan', tone: 'purple' },
  update_plan: { actionKey: 'tool.action.update_plan', tone: 'purple' },
  set_plan_item_status: { actionKey: 'tool.action.set_plan_item_status', tone: 'purple' },
  write_file: { actionKey: 'tool.action.write_file', tone: 'amber' },
  replace_in_file: { actionKey: 'tool.action.replace_in_file', tone: 'cyan' },
  create_directory: { actionKey: 'tool.action.create_directory', tone: 'blue' },
  delete_path: { actionKey: 'tool.action.delete_path', tone: 'rose' }
};

/**
 * Что это: нормализатор tool-сообщения в компактную модель для UI.
 * Зачем нужно: React-компоненты остаются простыми и не знают форму JSON каждого инструмента.
 * Пример: buildToolDisplayModel(message, t).title -> "READ FILE: src/index.ts".
 */
export function buildToolDisplayModel(message: ChatMessage, t: Translator): ToolDisplayModel {
  const meta = getToolMeta(message.name, t);
  const primaryFile = getPrimaryFileReference(message);
  const files = uniqueFiles(getAllFileReferences(message, primaryFile));
  const target = primaryFile?.path || getToolTarget(message, t) || '';

  return {
    action: meta.action,
    tone: meta.tone,
    primaryFile,
    files,
    title: target ? `${meta.action}: ${target}` : meta.action,
    summary: getShortSummary(message, t)
  };
}

function getToolMeta(name: string | undefined, t: Translator): { action: string; tone: ToolTone } {
  const meta = TOOL_META[name || ''];
  return meta
    ? { action: t(meta.actionKey), tone: meta.tone }
    : { action: name || t('tool.action.fallback'), tone: 'slate' };
}

function getAllFileReferences(message: ChatMessage, primaryFile?: FileReference): FileReference[] {
  return [primaryFile, ...getResultFileReferences(message)].filter(Boolean) as FileReference[];
}

function getPrimaryFileReference(message: ChatMessage): FileReference | undefined {
  const argPath = asString(message.args?.path);
  if (argPath) return withChangedRange({ path: argPath }, message);

  const resultPath = asString(getToolResult(message)?.path) || asString(getToolPreview(message)?.path);
  return resultPath ? withChangedRange({ path: resultPath }, message) : undefined;
}

/**
 * Обогащает FileReference информацией об изменённых строках из результата tool-call.
 * Нужно, чтобы ссылка показывала «changed lines 5-12» вместо просто пути.
 */
function withChangedRange(file: FileReference, message: ChatMessage): FileReference {
  const result = getToolResult(message);
  const line = typeof result?.changedStartLine === 'number' ? result.changedStartLine : undefined;
  const endLine = typeof result?.changedEndLine === 'number' ? result.changedEndLine : undefined;
  if (!line) return file;

  return {
    ...file,
    line,
    column: typeof result?.changedStartColumn === 'number' ? result.changedStartColumn : 1,
    endLine,
    endColumn: typeof result?.changedEndColumn === 'number' ? result.changedEndColumn : undefined,
    label: endLine && endLine !== line ? `changed lines ${line}-${endLine}` : `changed line ${line}`
  };
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

/**
 * Извлекает «цель» инструмента для заголовка: путь, скрипт, skillId и т.д.
 * Разные инструменты имеют разные поля-цели, поэтому нужен диспетчер.
 */
function getToolTarget(message: ChatMessage, t: Translator): string | undefined {
  if (message.name === 'run_bash_script') {
    return compactSingleLine(asString(message.args?.script));
  }

  if (message.name === 'run_skill') {
    return asString(message.args?.skillId) || asString(getToolResult(message)?.label);
  }

  if (message.name === 'compact_chat') {
    return asString(message.args?.trigger) || asString(getToolResult(message)?.chatId);
  }

  if (message.name === 'create_plan' || message.name === 'update_plan') {
    return asString(message.args?.title) || asString(getToolResult(message)?.title);
  }

  if (message.name === 'set_plan_item_status') {
    return t('tool.target.planItem', { index: String(message.args?.itemIndex || '') }).trim();
  }

  return (
    asString(message.args?.query) ||
    asString(message.args?.path) ||
    asString(getToolResult(message)?.path) ||
    asString(getToolPreview(message)?.path)
  );
}

/**
 * Строит краткую сводку результата для бейджа в заголовке карточки.
 * Формат зависит от типа инструмента: bash показывает exit code, grep — количество совпадений.
 */
function getShortSummary(message: ChatMessage, t: Translator): string {
  const result = getToolResult(message);
  if (!result && message.name === 'run_bash_script')
    return t('tool.summary.cwd', { cwd: asString(message.args?.cwd) || '.' });
  if (!result && message.name === 'run_skill')
    return t('tool.summary.skill', { skill: asString(message.args?.skillId) || '' }).trim();
  if (!result) return message.status || t('message.tool').toLowerCase();
  if (result.decision === 'denied') return asString(result.comment) || t('tool.status.denied');
  if (asString(result.error)) return asString(result.error) || t('tool.summary.toolError');
  if (message.name === 'grep_search') return t('tool.summary.matches', { count: arrayValue(result.matches).length });
  if (message.name === 'run_bash_script') return getBashSummary(result, t);
  if (message.name === 'run_skill') return getBashSummary(result, t);
  if (message.name === 'compact_chat') {
    const chatId = asString(result.chatId);
    return chatId ? t('tool.summary.newChat', { chatId }) : t('tool.summary.compacted');
  }
  if (message.name === 'create_plan' || message.name === 'update_plan') {
    return t('tool.summary.planItems', { count: Number(result.itemCount || 0) });
  }
  if (message.name === 'set_plan_item_status') {
    return t('tool.summary.planStatus', {
      index: Number(result.itemIndex || message.args?.itemIndex || 0),
      status: getPlanStatusLabel(asString(result.status) || asString(message.args?.status) || '', t)
    });
  }
  if (message.name === 'list_files') return t('tool.summary.entries', { count: arrayValue(result.entries).length });
  if (message.name === 'replace_in_file')
    return t('tool.summary.replacements', { count: Number(result.replacements || 0) });
  if (message.name === 'write_file' && typeof result.bytes === 'number')
    return t('tool.summary.bytes', { count: result.bytes });
  return message.status || t('message.tool').toLowerCase();
}

function getBashSummary(result: Record<string, unknown>, t: Translator): string {
  const exitLabel = result.timedOut
    ? t('tool.summary.timedOut')
    : t('tool.summary.exit', { code: String(result.exitCode ?? t('tool.summary.unknown')) });
  const durationLabel = typeof result.durationMs === 'number' ? ` · ${formatDuration(result.durationMs)}` : '';

  return `${exitLabel}${durationLabel}`;
}

function getPlanStatusLabel(status: string, t: Translator): string {
  if (status === 'in_progress') return t('plan.status.inProgress');
  if (status === 'done') return t('plan.status.done');
  if (status === 'blocked') return t('plan.status.blocked');
  if (status === 'pending') return t('plan.status.pending');
  return status;
}

/**
 * Сжимает многострочный текст в одну строку для отображения в заголовке.
 * Обрезает до 140 символов, чтобы не раздувать карточку длинными скриптами.
 */
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
    const key = `${file.path}:${file.line || 0}:${file.column || 0}:${file.endLine || 0}:${file.endColumn || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
