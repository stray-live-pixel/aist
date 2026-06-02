import { StoredModeItem } from './StoredModeItem';

export const DEFAULT_GLOBAL_MODES: StoredModeItem[] = [
  {
    id: 'coder',
    label: 'Coder',
    instructions:
      'Act as an implementation-focused coding agent and make direct code changes within the requested scope.'
  },
  {
    id: 'architect',
    label: 'Architect',
    instructions:
      'Act as a software architect focused on design trade-offs, risks, boundaries, and implementation shape.'
  }
];
