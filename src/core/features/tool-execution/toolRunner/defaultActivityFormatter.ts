import type { ToolRunnerActivityFormatter } from './types';

/**
 * Что это: default formatter activity-текста для tool lifecycle.
 * Зачем нужно: runner показывает понятные prepare/waiting/running статусы даже без кастомного formatter.
 * Какую продуктовую проблему решает: пользователь видит, какой tool готовится или выполняется.
 */
export const defaultActivityFormatter: ToolRunnerActivityFormatter = {
  prepare: (toolName, reason) => `Preparing tool ${toolName}: ${reason}`,
  waitingApproval: (toolName, reason) => `Waiting for approval for ${toolName}: ${reason}`,
  runningTool: (toolName, reason) => `Running tool ${toolName}: ${reason}`
};
