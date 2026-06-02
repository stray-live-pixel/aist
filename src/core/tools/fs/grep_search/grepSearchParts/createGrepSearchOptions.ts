import { clampNumber } from '../../../shared/clampNumber';
import { requireString } from '../../../shared/requireString';
import { getAdditionalExcludePatterns } from '../getAdditionalExcludePatterns';
import { GrepSearchOptions } from './GrepSearchOptions';

export function createGrepSearchOptions({ args }: { args: Record<string, unknown> }): GrepSearchOptions {
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
