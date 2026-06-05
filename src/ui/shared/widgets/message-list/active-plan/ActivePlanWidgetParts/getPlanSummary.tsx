import { type ChatPlan } from '../../../../types';
import { PlanSummary } from './PlanSummary';

export function getPlanSummary(plan: ChatPlan): PlanSummary {
  const summary = plan.items.reduce(
    (acc, item) => {
      acc[item.status === 'in_progress' ? 'inProgress' : item.status] += 1;
      return acc;
    },
    { total: plan.items.length, done: 0, blocked: 0, inProgress: 0, pending: 0, completed: false } as PlanSummary
  );
  summary.completed = summary.total > 0 && summary.done === summary.total;
  return summary;
}
