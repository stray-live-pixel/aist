export type ToolErrorCode =
  | 'TEXT_NOT_FOUND'
  | 'PATH_OUTSIDE_WORKSPACE'
  | 'FILE_NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'TIMEOUT'
  | 'INVALID_ARGUMENT';

export type StructuredToolFailure = {
  ok: false;
  code: ToolErrorCode;
  error: string;
  details?: Record<string, unknown>;
};

export class StructuredToolError extends Error {
  constructor(
    public readonly code: ToolErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StructuredToolError';
  }
}

export function createToolError(
  code: ToolErrorCode,
  message: string,
  details?: Record<string, unknown>
): StructuredToolError {
  return new StructuredToolError(code, message, details);
}

export function toStructuredToolFailure(error: unknown): StructuredToolFailure {
  const structured = getStructuredError(error);
  if (structured) {
    return {
      ok: false,
      code: structured.code,
      error: structured.message,
      ...(structured.details ? { details: structured.details } : {})
    };
  }

  return {
    ok: false,
    code: inferToolErrorCode(error),
    error: getErrorMessage(error)
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getStructuredError(
  error: unknown
): { code: ToolErrorCode; message: string; details?: Record<string, unknown> } | undefined {
  if (error instanceof StructuredToolError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  if (!isToolErrorCode(record.code) || typeof record.error !== 'string') {
    return undefined;
  }

  return {
    code: record.code,
    message: record.error,
    details: isRecord(record.details) ? record.details : undefined
  };
}

function inferToolErrorCode(error: unknown): ToolErrorCode {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('text was not found')) {
    return 'TEXT_NOT_FOUND';
  }

  if (normalized.includes('outside the workspace') || normalized.includes('escapes the workspace')) {
    return 'PATH_OUTSIDE_WORKSPACE';
  }

  if (
    normalized.includes('file not found') ||
    normalized.includes('entrynotfound') ||
    normalized.includes('enoent') ||
    normalized.includes('no such file')
  ) {
    return 'FILE_NOT_FOUND';
  }

  if (
    normalized.includes('not a directory') ||
    normalized.includes('enotdir') ||
    normalized.includes('must point to a workspace directory')
  ) {
    return 'NOT_A_DIRECTORY';
  }

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return 'TIMEOUT';
  }

  return 'INVALID_ARGUMENT';
}

function isToolErrorCode(value: unknown): value is ToolErrorCode {
  return (
    value === 'TEXT_NOT_FOUND' ||
    value === 'PATH_OUTSIDE_WORKSPACE' ||
    value === 'FILE_NOT_FOUND' ||
    value === 'NOT_A_DIRECTORY' ||
    value === 'TIMEOUT' ||
    value === 'INVALID_ARGUMENT'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
