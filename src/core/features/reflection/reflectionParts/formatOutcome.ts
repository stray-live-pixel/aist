import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { RunReflectionOutcome } from './RunReflectionOutcome';
import { truncateForReflection } from './truncateForReflection';

export function formatOutcome(outcome: RunReflectionOutcome): string {
  if (outcome.status === 'success') {
    return truncateForReflection(`success: ${outcome.answer || 'completed'}`, MAX_FIELD_CHARS);
  }
  if (outcome.status === 'stopped') {
    return 'stopped by user';
  }
  return truncateForReflection(`error: ${outcome.error || 'unknown error'}`, MAX_FIELD_CHARS);
}
