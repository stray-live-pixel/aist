import { type SearchMatch } from '../searchMatch';
import { trimSearchLine } from '../trimSearchLine';
import { GrepSearchOptions } from './GrepSearchOptions';

export function createDetailedMatch({
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
