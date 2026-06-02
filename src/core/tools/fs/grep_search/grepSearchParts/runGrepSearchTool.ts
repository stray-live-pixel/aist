import { getWorkspace } from '../../shared/getWorkspace';
import { type NodeFilesystemToolContext } from '../../shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../../shared/resolveWorkspacePath';
import { createLineMatcher } from '../createLineMatcher';
import { getSearchFiles } from '../getSearchFiles';
import { collectSearchMatches } from './collectSearchMatches';
import { createGrepSearchOptions } from './createGrepSearchOptions';

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
