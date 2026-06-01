import { MAX_GREP_MODEL_MATCHES } from './MAX_GREP_MODEL_MATCHES';
import { compactBase } from './compactBase';
import { createArtifactMarker } from './createArtifactMarker';
import { isLargeSerialized } from './isLargeSerialized';

export function compactGrepSearchResult(result: Record<string, unknown>): Record<string, unknown> {
  const matches = Array.isArray(result.matches) ? result.matches : [];
  if (matches.length <= MAX_GREP_MODEL_MATCHES && !isLargeSerialized(result)) {
    return result;
  }

  return compactBase(result, {
    query: result.query,
    path: result.path,
    include: result.include,
    exclude: result.exclude,
    regex: result.regex,
    caseSensitive: result.caseSensitive,
    filesOnly: result.filesOnly,
    countOnly: result.countOnly,
    filesInspected: result.filesInspected,
    fileLimitReached: result.fileLimitReached,
    totalMatches: result.totalMatches,
    returnedMatches: matches.length,
    topMatches: matches.slice(0, MAX_GREP_MODEL_MATCHES),
    omittedMatches: Math.max(0, matches.length - MAX_GREP_MODEL_MATCHES),
    truncatedByTool: Boolean(result.truncated),
    modelResultNotice: createArtifactMarker('grep_search')
  });
}
