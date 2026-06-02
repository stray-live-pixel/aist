import type { ToolRunnerActivityFormatter, ToolRunnerDeps } from './types';

/**
 * Что это: runtime-context ToolRunner после декомпозиции.
 * Зачем нужно: сценарные функции получают deps, clock и formatter без большого класса.
 * Какую продуктовую проблему решает: lifecycle tool-call остаётся консистентным после разбиения на маленькие файлы.
 */
export type ToolRunnerRuntime = {
  deps: ToolRunnerDeps;
  now: () => number;
  activityFormatter: ToolRunnerActivityFormatter;
};
