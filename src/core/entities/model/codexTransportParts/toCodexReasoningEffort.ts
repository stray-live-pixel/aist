import { type ReasoningEffort } from '../../../shared/types/types';

export function toCodexReasoningEffort(
  reasoningEffort: ReasoningEffort | undefined
): Exclude<ReasoningEffort, 'auto'> | undefined {
  if (!reasoningEffort || reasoningEffort === 'auto') {
    return undefined;
  }

  return reasoningEffort;
}
