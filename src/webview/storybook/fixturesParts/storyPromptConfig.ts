import { type AgentPromptConfig } from '../../shared/types';

export const storyPromptConfig: AgentPromptConfig = {
  globalInstructions: [
    {
      id: 'practical-coding',
      label: 'Practical coding',
      content: 'Work briefly and practically. Inspect relevant files before editing.',
      scope: 'global',
      kind: 'instruction'
    }
  ],
  localInstructions: [
    {
      id: 'project-style',
      label: 'Project style',
      content: 'Follow Feature-Sliced Design and keep files small.',
      scope: 'local',
      kind: 'instruction'
    }
  ],
  globalModes: [
    {
      id: 'coder',
      label: 'Coder',
      instructions: 'Implement the requested change directly and verify it.',
      scope: 'global',
      kind: 'mode'
    }
  ],
  localModes: [
    {
      id: 'frontend',
      label: 'Frontend polish',
      instructions: 'Focus on layout, interaction states, responsive behavior, and visual consistency.',
      scope: 'local',
      kind: 'mode'
    }
  ],
  presets: [
    {
      id: 'coding',
      label: 'Coding',
      instructionRefs: [
        { scope: 'global', id: 'practical-coding' },
        { scope: 'local', id: 'project-style' }
      ],
      modeRef: { scope: 'global', id: 'coder' },
      scope: 'local'
    }
  ],
  activeInstructionRefs: [
    { scope: 'global', id: 'practical-coding' },
    { scope: 'local', id: 'project-style' }
  ],
  activeModeRef: { scope: 'local', id: 'frontend' },
  activePresetId: 'coding'
};
