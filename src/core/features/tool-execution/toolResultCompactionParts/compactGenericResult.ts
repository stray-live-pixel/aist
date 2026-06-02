import { compactBase } from './compactBase';
import { createArtifactMarker } from './createArtifactMarker';

export function compactGenericResult(
  toolName: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>
): Record<string, unknown> {
  return compactBase(result, {
    tool: toolName,
    path: result.path ?? args.path,
    summary: 'Tool result was too large for model history.',
    modelResultNotice: createArtifactMarker(toolName)
  });
}
