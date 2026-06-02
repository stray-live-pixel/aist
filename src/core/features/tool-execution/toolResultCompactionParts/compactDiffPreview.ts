import { MAX_DIFF_MODEL_FILES } from './MAX_DIFF_MODEL_FILES';
import { compactDiffFile } from './compactDiffFile';
import { createArtifactMarker } from './createArtifactMarker';

export function compactDiffPreview(preview: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!preview) {
    return undefined;
  }

  const files = Array.isArray(preview.files) ? preview.files : [];
  return {
    ok: preview.ok,
    path: preview.path,
    instructions: preview.instructions,
    strategyUsed: preview.strategyUsed,
    diagnostics: preview.diagnostics,
    diffShown: preview.diffShown,
    editable: preview.editable,
    reason: preview.reason,
    files: files.slice(0, MAX_DIFF_MODEL_FILES).map(compactDiffFile),
    changedFileCount: files.length || undefined,
    omittedFiles: files.length > MAX_DIFF_MODEL_FILES ? files.length - MAX_DIFF_MODEL_FILES : undefined,
    modelResultNotice: createArtifactMarker('diff_preview')
  };
}
