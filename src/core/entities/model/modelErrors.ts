import type { ModelProvider } from '../../shared/types/types';

const MAX_RESPONSE_BODY_CHARS = 6000;

export type ModelRequestErrorInfo = {
  provider?: ModelProvider;
  model?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  statusText?: string;
  responseBody?: string;
  message?: string;
};

export class ModelRequestError extends Error {
  readonly info: ModelRequestErrorInfo;

  constructor(info: ModelRequestErrorInfo) {
    super(formatModelRequestError(info));
    this.name = 'ModelRequestError';
    this.info = {
      ...info,
      responseBody: truncateResponseBody(info.responseBody)
    };
  }

  toJSON(): ModelRequestErrorInfo & { name: string; message: string } {
    return {
      name: this.name,
      message: this.message,
      ...this.info
    };
  }
}

export function getModelRequestErrorInfo(error: unknown): ModelRequestErrorInfo | undefined {
  if (error instanceof ModelRequestError) {
    return error.info;
  }

  if (isObject(error) && isModelRequestErrorInfo(error.info)) {
    return error.info;
  }

  return undefined;
}

function formatModelRequestError(info: ModelRequestErrorInfo): string {
  const lines = ['Model HTTP request failed.'];
  if (info.provider) lines.push(`Provider: ${info.provider}`);
  if (info.model) lines.push(`Model: ${info.model}`);
  if (info.method || info.endpoint) lines.push(`Request: ${[info.method, info.endpoint].filter(Boolean).join(' ')}`);
  if (info.status) lines.push(`HTTP: ${info.status}${info.statusText ? ` ${info.statusText}` : ''}`);
  if (info.message) lines.push(`Error: ${info.message}`);

  const responseBody = truncateResponseBody(info.responseBody);
  if (responseBody) {
    lines.push('', 'Response body:', responseBody);
  }

  return lines.join('\n');
}

function truncateResponseBody(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.length <= MAX_RESPONSE_BODY_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_RESPONSE_BODY_CHARS).trimEnd()}\n... [truncated]`;
}

function isModelRequestErrorInfo(value: unknown): value is ModelRequestErrorInfo {
  if (!isObject(value)) {
    return false;
  }

  return (
    isOptionalString(value.provider) &&
    isOptionalString(value.model) &&
    isOptionalString(value.endpoint) &&
    isOptionalString(value.method) &&
    isOptionalNumber(value.status) &&
    isOptionalString(value.statusText) &&
    isOptionalString(value.responseBody) &&
    isOptionalString(value.message)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === 'number';
}
