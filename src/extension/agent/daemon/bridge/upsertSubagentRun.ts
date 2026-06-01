import type { SubagentRun } from '../../../../core/shared/types/types';

/**
 * Что это: добавляет или заменяет cached subagent run в списке parent-чата.
 * Зачем нужно: subagent.get может прийти раньше следующего subagent.list.
 * Какую продуктовую проблему решает: UI показывает свежий subagent run без дублей.
 */
export function upsertSubagentRun({ runs, nextRun }: { runs: SubagentRun[]; nextRun: SubagentRun }): SubagentRun[] {
  const nextRuns = runs.filter((run) => run.id !== nextRun.id);
  nextRuns.push(nextRun);
  return nextRuns.sort((left, right) => right.updatedAt - left.updatedAt || right.startedAt - left.startedAt);
}
