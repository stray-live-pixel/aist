import { MAX_DIFF_MODEL_FILES } from './MAX_DIFF_MODEL_FILES';
import { changedRange } from './changedRange';
import { compactBase } from './compactBase';
import { compactDiffFile } from './compactDiffFile';
import { createArtifactMarker } from './createArtifactMarker';

export function compactDiffToolResult(toolName: string, result: Record<string, unknown>): Record<string, unknown> {
  const compacted = compactBase(result, {
    path: result.path,
    bytes: result.bytes,
    replacements: result.replacements,
    generatedReplacements: result.generatedReplacements,
    instructions: result.instructions,
    strategyUsed: result.strategyUsed,
    diagnostics: result.diagnostics,
    changedRanges: result.changedRanges,
    changed: result.changed,
    ...changedRange(result),
    modelResultNotice: createArtifactMarker(toolName)
  });
  const files = Array.isArray(result.files)
    ? result.files
    : Array.isArray(result.changedFiles)
      ? result.changedFiles
      : [];
  if (files.length) {
    compacted.files = files.slice(0, MAX_DIFF_MODEL_FILES).map(compactDiffFile);
    compacted.changedFileCount = files.length;
    compacted.omittedFiles = Math.max(0, files.length - MAX_DIFF_MODEL_FILES);
  }
  return compacted;
}
