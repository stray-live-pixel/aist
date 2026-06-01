import { AgentPromptPreset } from './AgentPromptPreset';

export const DEFAULT_PRESETS: AgentPromptPreset[] = [
  {
    id: 'coding',
    label: 'Coding',
    instructionRefs: [
      { scope: 'global', id: 'practical-coding' },
      { scope: 'global', id: 'safe-changes' }
    ],
    modeRef: { scope: 'global', id: 'coder' },
    scope: 'global'
  },
  {
    id: 'design',
    label: 'Design',
    instructionRefs: [{ scope: 'global', id: 'practical-coding' }],
    modeRef: { scope: 'global', id: 'architect' },
    scope: 'global'
  }
];
