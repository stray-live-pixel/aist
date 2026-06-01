import { readTextFileForSearch } from '../readTextFileForSearch';
import { type SearchMatch } from '../searchMatch';
import { shouldSkipRelativePath } from '../shouldSkipRelativePath';
import { toWorkspaceRelativePath } from '../toWorkspaceRelativePath';
import { GrepSearchOptions } from './GrepSearchOptions';
import { SearchFilesResult } from './SearchFilesResult';
import { collectFileMatches } from './collectFileMatches';

export async function collectSearchMatches({
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
