import { storyAgentModes } from './storyAgentModes';

export const storyInstructionSources = [
  {
    id: 'base',
    title: 'AIST base system prompt',
    content: 'Core coding-agent rules, language policy and tool usage rules.',
    priority: 0,
    kind: 'base' as const,
    source: 'immutable kernel'
  },
  {
    id: 'AGENTS.md',
    title: 'AGENTS.md',
    content: 'Follow Feature-Sliced Design and keep files small.',
    priority: 20,
    kind: 'file' as const,
    source: 'AGENTS.md'
  },
  {
    id: '.aist-agent/instructions/project.md',
    title: '.aist-agent project instructions',
    content: 'Prefer simple implementations and run typecheck after edits.',
    priority: 12,
    kind: 'declarative' as const,
    source: '.aist-agent/instructions/project.md'
  },
  {
    id: 'mode:frontend',
    title: 'Mode: Frontend polish',
    content: storyAgentModes[2].instructions,
    priority: 50,
    kind: 'mode' as const
  }
];
