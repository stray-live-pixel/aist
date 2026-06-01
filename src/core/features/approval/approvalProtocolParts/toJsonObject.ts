import { createToolError } from '../../../shared/lib/toolErrors';

export function toJsonObject(value: Record<string, unknown>): Record<string, unknown> {
  try {
    const parsed = JSON.parse(JSON.stringify(value || {})) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    throw createToolError('INVALID_ARGUMENT', 'Approval arguments must be JSON-serializable.', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
