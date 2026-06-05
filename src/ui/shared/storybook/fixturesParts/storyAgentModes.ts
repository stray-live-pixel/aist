import { type AgentMode } from '../../types';

export const storyAgentModes: AgentMode[] = [
  {
    id: 'default',
    label: 'Default',
    instructions: 'Be concise, inspect the repository before editing, and explain important tradeoffs.'
  },
  {
    id: 'careful',
    label: 'Careful',
    instructions: 'Prefer small, reversible changes. Run verification after each risky edit.'
  },
  {
    id: 'frontend',
    label: 'Frontend polish',
    instructions: 'Focus on layout, interaction states, responsive behavior, and visual consistency.'
  }
];
