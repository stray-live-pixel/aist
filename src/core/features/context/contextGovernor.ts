import path from 'node:path';

import type { EditorContextMode, OpenRouterMessage } from '../../shared/types/types';

export type EditorContextInput = {
  fileName: string;
  languageId: string;
  selectionText: string;
  fullText: string;
  maxChars: number;
  mode: EditorContextMode;
};

export type ContextTaskType = 'read-only' | 'code-edit' | 'debug-test-fix' | 'repo-inspection';

export type ContextGovernorInput = {
  prompt: string;
  history: OpenRouterMessage[];
  editorContext?: EditorContextInput | null;
  repoContextNote?: string;
  memoryContextBlock?: string;
  budgets?: Partial<ContextGovernorBudgets>;
};

export type ContextGovernorBudgets = {
  editorContextChars: number;
  historyTailChars: number;
  historyTailMessages: number;
  recentToolSummaries: number;
};

export type GovernedContext = {
  taskType: ContextTaskType;
  messages: OpenRouterMessage[];
  userContent: string;
  contextNote: string;
  editorContextBlock: string;
  recentToolSummaries: string[];
  keptHistoryMessages: number;
  omittedHistoryMessages: number;
};

const DEFAULT_BUDGETS: ContextGovernorBudgets = {
  editorContextChars: 8000,
  historyTailChars: 24000,
  historyTailMessages: 24,
  recentToolSummaries: 3
};

const DEBUG_TEST_FIX_PATTERN =
  /\b(error|exception|stack trace|failing|failure|failed|bug|crash|debug|fix tests?|test failure|vitest|jest|mocha|playwright|typecheck|compile|build)\b|ошиб|пада(ет|ют)|тест|сборк|почин/i;
const CODE_EDIT_PATTERN =
  /\b(add|build|change|create|delete|edit|implement|modify|patch|refactor|rename|replace|update|write|fix)\b|добав|измен|исправ|реализ|обнов|переимен|рефактор|созда/i;
const REPO_INSPECTION_PATTERN =
  /\b(inspect|explore|search|find|locate|where is|list files?|repo|repository|codebase|architecture|structure)\b|найд|поиск|покажи|структур|репозитор|код(ов)?ая база/i;

export function governModelContext(input: ContextGovernorInput): GovernedContext {
  const taskType = classifyContextTask(input.prompt);
  const userContent = input.prompt;
  const messages = [...input.history, { role: 'user' as const, content: userContent }];

  return {
    taskType,
    messages,
    userContent,
    contextNote: '',
    editorContextBlock: '',
    recentToolSummaries: [],
    keptHistoryMessages: input.history.length,
    omittedHistoryMessages: 0
  };
}

export function classifyContextTask(prompt: string): ContextTaskType {
  const normalized = String(prompt || '').trim();

  if (DEBUG_TEST_FIX_PATTERN.test(normalized)) {
    return 'debug-test-fix';
  }

  if (CODE_EDIT_PATTERN.test(normalized)) {
    return 'code-edit';
  }

  if (REPO_INSPECTION_PATTERN.test(normalized)) {
    return 'repo-inspection';
  }

  return 'read-only';
}

type EditorPack = {
  block: string;
  description: string;
  omittedFullFile: boolean;
};

function buildGovernedEditorContext(
  prompt: string,
  taskType: ContextTaskType,
  editorContext: EditorContextInput | null | undefined,
  budgets: ContextGovernorBudgets
): EditorPack {
  if (!editorContext || editorContext.mode === 'off') {
    return { block: '', description: 'No active editor context included.', omittedFullFile: false };
  }

  const header = [`File: ${editorContext.fileName}`, `Language: ${editorContext.languageId}`];
  const selectionText = editorContext.selectionText.trim();
  const editorBudget = Math.max(0, Math.min(editorContext.maxChars, budgets.editorContextChars));

  if (editorContext.mode === 'selection') {
    const block = [
      ...header,
      ...(selectionText ? [`Selected code:\n${truncateText(selectionText, editorBudget)}`] : [])
    ]
      .filter(Boolean)
      .join('\n\n');
    return {
      block,
      description: selectionText ? 'Included active selection.' : 'Included active file metadata only.',
      omittedFullFile: Boolean(editorContext.fullText.trim())
    };
  }

  if (editorContext.mode === 'file') {
    const body = selectionText
      ? `Selected code:\n${truncateText(selectionText, editorBudget)}`
      : `File content:\n${truncateText(editorContext.fullText, editorBudget)}`;
    return {
      block: [...header, body].join('\n\n'),
      description: selectionText
        ? 'Included active selection.'
        : 'Included active file content because file mode is enabled.',
      omittedFullFile: false
    };
  }

  if (selectionText) {
    return {
      block: [...header, `Selected code:\n${truncateText(selectionText, editorBudget)}`].join('\n\n'),
      description: 'Included active selection.',
      omittedFullFile: Boolean(editorContext.fullText.trim())
    };
  }

  if (shouldIncludeAutoFullFile(prompt, taskType, editorContext)) {
    return {
      block: [...header, `File content:\n${truncateText(editorContext.fullText, editorBudget)}`].join('\n\n'),
      description: 'Included active file content because the request references the active file.',
      omittedFullFile: false
    };
  }

  return {
    block: header.join('\n\n'),
    description: 'Included active file metadata only.',
    omittedFullFile: Boolean(editorContext.fullText.trim())
  };
}

function shouldIncludeAutoFullFile(
  prompt: string,
  taskType: ContextTaskType,
  editorContext: EditorContextInput
): boolean {
  if (taskType !== 'code-edit' && taskType !== 'debug-test-fix') {
    return false;
  }

  const normalizedPrompt = prompt.toLowerCase();
  const fileName = path.basename(editorContext.fileName).toLowerCase();
  return (
    /\b(active|current|open|opened|this)\s+file\b|\bthis file\b|текущ(ий|ем|его)? файл|эт(от|ом|ого)? файл/i.test(
      prompt
    ) ||
    (fileName.length > 0 && normalizedPrompt.includes(fileName))
  );
}

type HistoryTail = {
  messages: OpenRouterMessage[];
  omitted: number;
};

function selectHistoryTail(history: OpenRouterMessage[], budgets: ContextGovernorBudgets): HistoryTail {
  const candidates = history.filter((message) => message.role !== 'system');
  const selected: OpenRouterMessage[] = [];
  let usedChars = 0;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const message = candidates[index];
    const messageChars = estimateMessageChars(message);
    if (
      selected.length >= budgets.historyTailMessages ||
      (selected.length > 0 && usedChars + messageChars > budgets.historyTailChars)
    ) {
      break;
    }

    selected.unshift(message);
    usedChars += messageChars;
  }

  while (selected[0]?.role === 'tool') {
    selected.shift();
  }

  return {
    messages: selected,
    omitted: Math.max(0, candidates.length - selected.length)
  };
}

function estimateMessageChars(message: OpenRouterMessage): number {
  return (
    String(message.content || '').length +
    String(message.reasoning || '').length +
    (message.tool_calls?.length ? JSON.stringify(message.tool_calls).length : 0) +
    String(message.tool_call_id || '').length +
    32
  );
}

function collectRecentToolSummaries(history: OpenRouterMessage[], limit: number): string[] {
  if (limit <= 0) {
    return [];
  }

  const summaries: string[] = [];
  for (let index = history.length - 1; index >= 0 && summaries.length < limit; index -= 1) {
    const message = history[index];
    if (message.role !== 'tool' || !message.content) {
      continue;
    }

    summaries.unshift(summarizeToolMessage(message));
  }

  return summaries;
}

function summarizeToolMessage(message: OpenRouterMessage): string {
  const parsed = parseJsonObject(message.content || '');
  const toolId = message.tool_call_id ? `tool_call_id=${message.tool_call_id}` : 'tool result';
  if (!parsed) {
    return `${toolId}: ${truncateSingleLine(message.content || '', 220)}`;
  }

  const parts = [
    parsed.ok === false ? 'failed' : parsed.ok === true ? 'ok' : '',
    stringField(parsed, 'path'),
    stringField(parsed, 'cwd'),
    stringField(parsed, 'error'),
    stringField(parsed, 'summary'),
    stringField(parsed, 'modelResultNotice')
  ].filter(Boolean);

  return `${toolId}: ${truncateSingleLine(parts.join('; ') || JSON.stringify(parsed), 220)}`;
}

function parseJsonObject(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function buildContextNote(input: {
  taskType: ContextTaskType;
  editorPack: EditorPack;
  recentToolSummaries: string[];
  repoContextNote?: string;
  memoryContextBlock?: string;
  keptHistoryMessages: number;
  omittedHistoryMessages: number;
}): string {
  const parts = [
    `Task classified as ${input.taskType}.`,
    input.editorPack.description,
    `Using ${input.keptHistoryMessages} recent history message${input.keptHistoryMessages === 1 ? '' : 's'}.`
  ];

  if (input.omittedHistoryMessages > 0) {
    parts.push(
      `Omitted ${input.omittedHistoryMessages} older history message${input.omittedHistoryMessages === 1 ? '' : 's'} to stay within budget.`
    );
  }

  if (input.editorPack.omittedFullFile) {
    parts.push('Omitted full active file content because it was not required by the selected context pack.');
  }

  if (input.recentToolSummaries.length) {
    parts.push(
      `Included ${input.recentToolSummaries.length} recent tool summar${input.recentToolSummaries.length === 1 ? 'y' : 'ies'}.`
    );
  }

  if (input.repoContextNote) {
    parts.push('Included repository verification hints.');
  }

  if (input.memoryContextBlock) {
    parts.push('Included relevant memory notes.');
  }

  return parts.join(' ');
}

function normalizeBudgets(budgets: Partial<ContextGovernorBudgets> | undefined): ContextGovernorBudgets {
  return {
    editorContextChars: normalizePositiveBudget(budgets?.editorContextChars, DEFAULT_BUDGETS.editorContextChars),
    historyTailChars: normalizePositiveBudget(budgets?.historyTailChars, DEFAULT_BUDGETS.historyTailChars),
    historyTailMessages: normalizePositiveBudget(budgets?.historyTailMessages, DEFAULT_BUDGETS.historyTailMessages),
    recentToolSummaries: normalizePositiveBudget(budgets?.recentToolSummaries, DEFAULT_BUDGETS.recentToolSummaries)
  };
}

function normalizePositiveBudget(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined ? Math.max(0, Math.floor(value)) : fallback;
}

function truncateText(text: string, maxChars: number): string {
  if (maxChars <= 0) {
    return '';
  }

  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...<truncated>` : text;
}

function truncateSingleLine(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
}
