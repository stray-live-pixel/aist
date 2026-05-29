/**
 * Что это: поддерживаемые declarative-файлы с проектными правилами агента.
 * Зачем нужно: daemon и UI должны искать одинаковые файлы и показывать одинаковые приоритеты.
 */
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
