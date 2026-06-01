import { MAX_BASH_STREAM_MODEL_CHARS } from './MAX_BASH_STREAM_MODEL_CHARS';
import { compactBase } from './compactBase';
import { createArtifactMarker } from './createArtifactMarker';
import { createTextPreview } from './createTextPreview';
import { removeUndefined } from './removeUndefined';
import { stringValue } from './stringValue';

export function compactErrorResult(toolName: string, result: Record<string, unknown>): Record<string, unknown> {
  const compacted = compactBase(result, {
    code: result.code,
    error: result.error,
    details: result.details,
    cwd: result.cwd,
    path: result.path,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    modelResultNotice: createArtifactMarker(toolName)
  });

  if (typeof result.stdout === 'string' || typeof result.stderr === 'string') {
    const stdout = stringValue(result.stdout);
    const stderr = stringValue(result.stderr);
    const stdoutPreview = createTextPreview(stdout, MAX_BASH_STREAM_MODEL_CHARS);
    const stderrPreview = createTextPreview(stderr, MAX_BASH_STREAM_MODEL_CHARS);
    return removeUndefined({
      ...compacted,
      stdoutPreview: stdoutPreview.text,
      stderrPreview: stderrPreview.text,
      stdoutChars: stdout.length,
      stderrChars: stderr.length,
      stdoutOmittedChars: stdoutPreview.omittedChars,
      stderrOmittedChars: stderrPreview.omittedChars,
      stdoutTruncatedByTool: Boolean(result.stdoutTruncated),
      stderrTruncatedByTool: Boolean(result.stderrTruncated)
    });
  }

  return compacted;
}
