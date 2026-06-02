import { MAX_BASH_STREAM_MODEL_CHARS } from './MAX_BASH_STREAM_MODEL_CHARS';
import { compactBase } from './compactBase';
import { createArtifactMarker } from './createArtifactMarker';
import { createTextPreview } from './createTextPreview';
import { isLargeSerialized } from './isLargeSerialized';
import { stringValue } from './stringValue';

export function compactBashResult(result: Record<string, unknown>): Record<string, unknown> {
  const stdout = stringValue(result.stdout);
  const stderr = stringValue(result.stderr);
  if (stdout.length + stderr.length <= MAX_BASH_STREAM_MODEL_CHARS && !isLargeSerialized(result)) {
    return result;
  }

  const stdoutPreview = createTextPreview(stdout, MAX_BASH_STREAM_MODEL_CHARS);
  const stderrPreview = createTextPreview(stderr, MAX_BASH_STREAM_MODEL_CHARS);
  return compactBase(result, {
    cwd: result.cwd,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdoutPreview: stdoutPreview.text,
    stderrPreview: stderrPreview.text,
    stdoutChars: stdout.length,
    stderrChars: stderr.length,
    stdoutOmittedChars: stdoutPreview.omittedChars,
    stderrOmittedChars: stderrPreview.omittedChars,
    stdoutTruncatedByTool: Boolean(result.stdoutTruncated),
    stderrTruncatedByTool: Boolean(result.stderrTruncated),
    modelResultNotice: createArtifactMarker('run_bash_script')
  });
}
