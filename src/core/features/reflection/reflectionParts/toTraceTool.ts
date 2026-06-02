import { type ChatMessage } from '../../../shared/types/types';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { RunReflectionTraceTool } from './RunReflectionTraceTool';
import { getToolTarget } from './getToolTarget';
import { truncateForReflection } from './truncateForReflection';

export function toTraceTool(message: ChatMessage): RunReflectionTraceTool {
  return {
    name: message.name || 'tool',
    status: message.status || 'unknown',
    reason: truncateForReflection(message.reason || '', MAX_FIELD_CHARS),
    target: getToolTarget(message)
  };
}
