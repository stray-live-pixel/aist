import { type AgentSkill } from '../../types';

export const storyCustomSkills: AgentSkill[] = [
  {
    id: 'focused-tests',
    label: 'Focused tests',
    description: 'Run the smallest useful test command for the current change.',
    command: 'npm run test -- --run',
    permission: 'ask',
    scope: 'local'
  }
];
