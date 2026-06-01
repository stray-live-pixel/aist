import path from 'node:path';

export const DECLARATIVE_INSTRUCTION_FILES = [
  {
    path: '.aist-agent/instructions/project.md',
    title: '.aist-agent project instructions',
    priority: 12
  },
  {
    path: '.aist-agent/policies/prompt-policy.md',
    title: '.aist-agent prompt policy',
    priority: 14
  }
] as const;
