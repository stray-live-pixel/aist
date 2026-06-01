import { type SearchMatch } from '../searchMatch';
import { GrepSearchOptions } from './GrepSearchOptions';
import { createDetailedMatch } from './createDetailedMatch';

export function collectFileMatches({
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
