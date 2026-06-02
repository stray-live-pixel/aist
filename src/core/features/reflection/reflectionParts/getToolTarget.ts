import { type ChatMessage } from '../../../shared/types/types';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { truncateForReflection } from './truncateForReflection';

export function getToolTarget(message: ChatMessage): string | undefined {
  const args = message.args || {};
  const target = typeof args.path === 'string' ? args.path : typeof args.cwd === 'string' ? args.cwd : undefined;
  if (target) {
    return truncateForReflection(target, MAX_FIELD_CHARS);
  }

  if (message.name === 'run_bash_script' && typeof args.script === 'string') {
    return truncateForReflection(args.script, MAX_FIELD_CHARS);
  }

  return undefined;
}
