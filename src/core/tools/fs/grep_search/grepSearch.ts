import type { OpenRouterTool } from '../../../shared/types/types';
import { clampNumber } from '../../shared/clampNumber';
import { requireString } from '../../shared/requireString';
import { getWorkspace } from '../shared/getWorkspace';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../shared/resolveWorkspacePath';
import { createLineMatcher } from './createLineMatcher';
import { getAdditionalExcludePatterns } from './getAdditionalExcludePatterns';
import { getSearchFiles } from './getSearchFiles';
import { readTextFileForSearch } from './readTextFileForSearch';
import type { SearchMatch } from './searchMatch';
import { shouldSkipRelativePath } from './shouldSkipRelativePath';
import { toWorkspaceRelativePath } from './toWorkspaceRelativePath';
import { trimSearchLine } from './trimSearchLine';

/**
 * Описание инструмента grep_search для модели.
 *
 * Контракт оставлен прежним: модель передаёт query, опциональные path/include,
 * режим regex/caseSensitive, размеры контекста, compact-режимы и лимиты обхода.
 */
export const grepSearchToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'grep_search',
    description:
      'Search workspace files for text or a regular expression and return matching file paths with line numbers.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
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
          description: 'Additional glob pattern to exclude from search, combined with the standard ignored directories.'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of matches to return, or paths in compact modes. Default is 100.'
        },
        maxFiles: { type: 'number', description: 'Maximum number of files to inspect. Default is 2000.' }
      },
      required: ['reason', 'nextStep', 'query'],
      additionalProperties: false
    }
  }
};

/**
 * Ищет текст или регулярное выражение в файлах workspace.
 *
 * Функция оркестрирует поиск: нормализует аргументы, безопасно выбирает файлы,
 * читает только текстовые небольшие файлы, собирает совпадения и возвращает тот
 * же shape ответа, что был у прежней inline-реализации.
 */
export async function runGrepSearchTool({
  context,
  args
}: {
  context: NodeFilesystemToolContext;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const options = createGrepSearchOptions({ args });
  const workspace = await getWorkspace({ context });
  const base = await resolveWorkspacePath({
    context,
    relativePath: options.searchPath,
    options: { allowMissing: false }
  });
  const searchFiles = await getSearchFiles({
    workspace,
    base,
    include: options.include,
    maxFiles: options.maxFiles
  });
  const matcher = createLineMatcher({
    query: options.query,
    useRegex: options.useRegex,
    caseSensitive: options.caseSensitive
  });

  const state = await collectSearchMatches({ workspaceRoot: workspace.rootPath, searchFiles, matcher, options });

  return {
    ok: true,
    query: options.query,
    path: options.searchPath,
    include: options.include,
    exclude: options.excludePatterns,
    regex: options.useRegex,
    caseSensitive: options.caseSensitive,
    filesOnly: options.filesOnly,
    countOnly: options.countOnly,
    beforeLines: options.beforeLines,
    afterLines: options.afterLines,
    filesInspected: state.searchedFiles,
    fileLimitReached: searchFiles.limitReached,
    ...(!options.filesOnly ? { totalMatches: state.totalMatches } : {}),
    matches: state.matches,
    truncated: state.matches.length >= options.maxResults
  };
}

type GrepSearchOptions = {
  query: string;
  searchPath: string;
  include: string;
  caseSensitive: boolean;
  useRegex: boolean;
  beforeLines: number;
  afterLines: number;
  filesOnly: boolean;
  countOnly: boolean;
  excludePatterns: string[];
  maxResults: number;
  maxFiles: number;
};

type SearchFilesResult = {
  files: string[];
  limitReached: boolean;
};

/** Нормализует входные аргументы grep_search в понятную внутреннюю структуру. */
function createGrepSearchOptions({ args }: { args: Record<string, unknown> }): GrepSearchOptions {
  const query = requireString({ value: args.query, name: 'query' });
  const searchPath = String(args.path || '.');
  const include = typeof args.include === 'string' && args.include.trim() ? args.include.trim() : '**/*';
  const contextLines = clampNumber({ value: args.contextLines, fallback: 0, min: 0, max: 5 });
  const beforeLines = clampNumber({ value: args.beforeLines, fallback: contextLines, min: 0, max: 5 });
  const afterLines = clampNumber({ value: args.afterLines, fallback: contextLines, min: 0, max: 5 });
  const filesOnly = Boolean(args.filesOnly);

  return {
    query,
    searchPath,
    include,
    caseSensitive: Boolean(args.caseSensitive),
    useRegex: Boolean(args.regex),
    beforeLines,
    afterLines,
    filesOnly,
    countOnly: Boolean(args.countOnly) && !filesOnly,
    excludePatterns: getAdditionalExcludePatterns({ value: args.exclude }),
    maxResults: clampNumber({ value: args.maxResults, fallback: 100, min: 1, max: 1000 }),
    maxFiles: clampNumber({ value: args.maxFiles, fallback: 2000, min: 1, max: 10000 })
  };
}

/** Обходит выбранные файлы и собирает итоговое состояние поиска. */
async function collectSearchMatches({
  workspaceRoot,
  searchFiles,
  matcher,
  options
}: {
  workspaceRoot: string;
  searchFiles: SearchFilesResult;
  matcher: (line: string) => number | undefined;
  options: GrepSearchOptions;
}): Promise<{ matches: SearchMatch[]; searchedFiles: number; totalMatches: number }> {
  const matches: SearchMatch[] = [];
  let searchedFiles = 0;
  let totalMatches = 0;

  for (const filePath of searchFiles.files) {
    if (matches.length >= options.maxResults) {
      break;
    }

    const relativePath = toWorkspaceRelativePath({ rootPath: workspaceRoot, absolutePath: filePath });
    if (shouldSkipRelativePath({ relativePath, excludePatterns: options.excludePatterns })) {
      continue;
    }

    const content = await readTextFileForSearch({ filePath });
    if (content === undefined) {
      continue;
    }

    searchedFiles += 1;
    const fileResult = collectFileMatches({
      relativePath,
      content,
      matcher,
      options,
      currentMatchCount: matches.length
    });
    totalMatches += fileResult.totalMatches;
    matches.push(...fileResult.matches);
  }

  return { matches, searchedFiles, totalMatches };
}

/** Собирает совпадения внутри одного файла с учётом compact-режимов. */
function collectFileMatches({
  relativePath,
  content,
  matcher,
  options,
  currentMatchCount
}: {
  relativePath: string;
  content: string;
  matcher: (line: string) => number | undefined;
  options: GrepSearchOptions;
  currentMatchCount: number;
}): { matches: SearchMatch[]; totalMatches: number } {
  const matches: SearchMatch[] = [];
  const lines = content.split(/\r?\n/);
  let fileMatchCount = 0;
  let totalMatches = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (!options.filesOnly && !options.countOnly && currentMatchCount + matches.length >= options.maxResults) {
      break;
    }

    const column = matcher(lines[index]);
    if (column === undefined) {
      continue;
    }

    fileMatchCount += 1;
    totalMatches += 1;

    if (options.filesOnly) {
      matches.push({ path: relativePath });
      break;
    }

    if (options.countOnly) {
      continue;
    }

    matches.push(createDetailedMatch({ relativePath, lines, index, column, options }));
  }

  if (options.countOnly && fileMatchCount > 0) {
    matches.push({ path: relativePath, count: fileMatchCount });
  }

  return { matches, totalMatches };
}

/** Формирует подробное совпадение со строкой, колонкой и соседним контекстом. */
function createDetailedMatch({
  relativePath,
  lines,
  index,
  column,
  options
}: {
  relativePath: string;
  lines: string[];
  index: number;
  column: number;
  options: GrepSearchOptions;
}): SearchMatch {
  const match: SearchMatch = {
    path: relativePath,
    line: index + 1,
    column: column + 1,
    text: trimSearchLine({ line: lines[index] })
  };

  if (options.beforeLines > 0) {
    match.before = lines.slice(Math.max(0, index - options.beforeLines), index).map((line) => trimSearchLine({ line }));
  }

  if (options.afterLines > 0) {
    match.after = lines.slice(index + 1, index + 1 + options.afterLines).map((line) => trimSearchLine({ line }));
  }

  return match;
}
