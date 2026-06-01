import { StoredInstructionItem } from './StoredInstructionItem';

export const DEFAULT_GLOBAL_INSTRUCTIONS: StoredInstructionItem[] = [
  {
    id: 'practical-coding',
    label: 'Practical coding',
    content: 'Favor the simplest working implementation and keep the user-facing explanation practical.'
  },
  {
    id: 'safe-changes',
    label: 'Safe changes',
    content: 'Keep changes small and avoid risky operations unless the user explicitly needs them.'
  }
];
