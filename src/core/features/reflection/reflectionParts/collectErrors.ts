import { type ChatMessage } from '../../../shared/types/types';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { RunReflectionOutcome } from './RunReflectionOutcome';
import { stringField } from './stringField';
import { truncateForReflection } from './truncateForReflection';
import { uniqueLimited } from './uniqueLimited';

export function collectErrors(messages: ChatMessage[], outcome: RunReflectionOutcome): string[] {
  const errors = messages.flatMap((message) => {
    if (message.role === 'error') {
      return [message.content || 'error'];
    }
    if (message.role !== 'tool' || (message.status !== 'error' && message.status !== 'denied')) {
      return [];
    }
    const modelResult = message.modelResult || {};
    const result = message.result || {};
    return [
      stringField(modelResult.error) ||
        stringField(modelResult.code) ||
        stringField(result.error) ||
        stringField(result.code) ||
        `${message.name || 'tool'} ${message.status}`
    ];
  });

  if (outcome.status === 'error' && outcome.error) {
    errors.push(outcome.error);
  }

  return uniqueLimited(errors.map((error) => truncateForReflection(error, MAX_FIELD_CHARS)).filter(Boolean));
}
