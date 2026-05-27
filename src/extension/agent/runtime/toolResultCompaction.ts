const MAX_FULL_MODEL_RESULT_CHARS = 6000;
const MAX_READ_FILE_MODEL_CONTENT_CHARS = 4000;
const MAX_BASH_STREAM_MODEL_CHARS = 3000;
const MAX_GREP_MODEL_MATCHES = 25;
const MAX_DIFF_MODEL_FILES = 25;

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

function compactExecutableResult(
  toolName: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>
): Record<string, unknown> {
  if (result.ok === false) {
    return compactErrorResult(toolName, result);
  }

  switch (toolName) {
    case 'read_file':
      return compactReadFileResult(result);
    case 'grep_search':
      return compactGrepSearchResult(result);
    case 'run_bash_script':
      return compactBashResult(result);
    case 'write_file':
    case 'replace_in_file':
    case 'apply_patch':
      return compactDiffToolResult(toolName, result);
    default:
      return isLargeSerialized(result) ? compactGenericResult(toolName, args, result) : result;
  }
}

function shouldCompact(toolName: string, result: Record<string, unknown>, uiResult: Record<string, unknown>): boolean {
  if (toolName === 'read_file') {
    return stringValue(result.content).length > MAX_READ_FILE_MODEL_CONTENT_CHARS || isLargeSerialized(result);
  }

  if (toolName === 'run_bash_script') {
    return (
      stringValue(result.stdout).length + stringValue(result.stderr).length > MAX_BASH_STREAM_MODEL_CHARS ||
      isLargeSerialized(result)
    );
  }

  if (toolName === 'grep_search') {
    const matches = Array.isArray(result.matches) ? result.matches : [];
    return matches.length > MAX_GREP_MODEL_MATCHES || isLargeSerialized(result);
  }

  if (['write_file', 'replace_in_file', 'apply_patch'].includes(toolName)) {
    const files = Array.isArray(result.files)
      ? result.files
      : Array.isArray(result.changedFiles)
        ? result.changedFiles
        : [];
    return files.length > MAX_DIFF_MODEL_FILES || isLargeSerialized(result) || isLargeSerialized(uiResult);
  }

  return isLargeSerialized(uiResult);
}

function compactReadFileResult(result: Record<string, unknown>): Record<string, unknown> {
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

function compactGrepSearchResult(result: Record<string, unknown>): Record<string, unknown> {
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

function compactBashResult(result: Record<string, unknown>): Record<string, unknown> {
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

function compactDiffToolResult(toolName: string, result: Record<string, unknown>): Record<string, unknown> {
  const compacted = compactBase(result, {
    path: result.path,
    bytes: result.bytes,
    replacements: result.replacements,
    generatedReplacements: result.generatedReplacements,
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

function compactDiffPreview(preview: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!preview) {
    return undefined;
  }

  const files = Array.isArray(preview.files) ? preview.files : [];
  return {
    ok: preview.ok,
    path: preview.path,
    diffShown: preview.diffShown,
    editable: preview.editable,
    reason: preview.reason,
    files: files.slice(0, MAX_DIFF_MODEL_FILES).map(compactDiffFile),
    changedFileCount: files.length || undefined,
    omittedFiles: files.length > MAX_DIFF_MODEL_FILES ? files.length - MAX_DIFF_MODEL_FILES : undefined,
    modelResultNotice: createArtifactMarker('diff_preview')
  };
}

function compactErrorResult(toolName: string, result: Record<string, unknown>): Record<string, unknown> {
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

function compactGenericResult(
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

function compactBase(result: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  return removeUndefined({
    ok: result.ok,
    ...extra,
    userApprovalComment: result.userApprovalComment
  });
}

function getExecutableResult(uiResult: Record<string, unknown>): Record<string, unknown> {
  return asRecord(uiResult.result) ?? uiResult;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function compactDiffFile(value: unknown): Record<string, unknown> {
  const file = asRecord(value) || {};
  return removeUndefined({
    path: file.path,
    created: file.created,
    bytes: file.bytes,
    replacements: file.replacements,
    generatedReplacements: file.generatedReplacements,
    changed: file.changed,
    ...changedRange(file)
  });
}

function changedRange(value: Record<string, unknown>): Record<string, unknown> {
  return removeUndefined({
    changedStartLine: value.changedStartLine,
    changedStartColumn: value.changedStartColumn,
    changedEndLine: value.changedEndLine,
    changedEndColumn: value.changedEndColumn
  });
}

function createTextPreview(value: string, maxChars: number): { text: string; omittedChars: number } {
  if (value.length <= maxChars) {
    return { text: value, omittedChars: 0 };
  }

  const headChars = Math.floor(maxChars * 0.7);
  const tailChars = maxChars - headChars;
  const omittedChars = value.length - maxChars;
  return {
    text: `${value.slice(0, headChars).trimEnd()}\n\n[... ${omittedChars} chars omitted from model history ...]\n\n${value
      .slice(value.length - tailChars)
      .trimStart()}`,
    omittedChars
  };
}

function countLines(value: string): number {
  return value ? value.split(/\r?\n/).length : 0;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isLargeSerialized(value: Record<string, unknown>): boolean {
  return JSON.stringify(value).length > MAX_FULL_MODEL_RESULT_CHARS;
}

function createArtifactMarker(toolName: string): Record<string, unknown> {
  return {
    compacted: true,
    tool: toolName,
    fullResultStoredIn: 'ChatMessage.result',
    reason: 'Full tool output omitted from model history to reduce context size.'
  };
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
