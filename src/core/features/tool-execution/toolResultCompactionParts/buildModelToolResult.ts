import { asRecord } from './asRecord';
import { compactDiffPreview } from './compactDiffPreview';
import { compactExecutableResult } from './compactExecutableResult';
import { createArtifactMarker } from './createArtifactMarker';
import { getExecutableResult } from './getExecutableResult';
import { shouldCompact } from './shouldCompact';

export function buildModelToolResult(
  toolName: string,
  args: Record<string, unknown>,
  uiResult: Record<string, unknown>
): Record<string, unknown> {
  const result = getExecutableResult(uiResult);

  if (!shouldCompact(toolName, result, uiResult)) {
    return result;
  }

  const compactResult = compactExecutableResult(toolName, args, result);
  if (result === uiResult) {
    return compactResult;
  }

  return {
    preview: compactDiffPreview(asRecord(uiResult.preview)),
    result: compactResult,
    modelResultNotice: createArtifactMarker(toolName)
  };
}
