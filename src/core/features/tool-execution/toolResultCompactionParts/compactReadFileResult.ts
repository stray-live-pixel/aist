import { MAX_READ_FILE_MODEL_CONTENT_CHARS } from './MAX_READ_FILE_MODEL_CONTENT_CHARS';
import { compactBase } from './compactBase';
import { countLines } from './countLines';
import { createArtifactMarker } from './createArtifactMarker';
import { createTextPreview } from './createTextPreview';
import { isLargeSerialized } from './isLargeSerialized';
import { stringValue } from './stringValue';

export function compactReadFileResult(result: Record<string, unknown>): Record<string, unknown> {
  const content = stringValue(result.content);
  if (content.length <= MAX_READ_FILE_MODEL_CONTENT_CHARS && !isLargeSerialized(result)) {
    return result;
  }

  const preview = createTextPreview(content, MAX_READ_FILE_MODEL_CONTENT_CHARS);
  return compactBase(result, {
    path: result.path,
    contentPreview: preview.text,
    contentChars: content.length,
    contentLines: countLines(content),
    contentOmittedChars: preview.omittedChars,
    truncatedByTool: Boolean(result.truncated),
    modelResultNotice: createArtifactMarker('read_file')
  });
}
