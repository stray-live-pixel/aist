import { sanitizeMemoryNote } from '../../../entities/memory/memory';

export function sanitizeApprovalText(input: unknown): string | undefined {
  return typeof input === 'string' ? sanitizeMemoryNote(input) : undefined;
}
