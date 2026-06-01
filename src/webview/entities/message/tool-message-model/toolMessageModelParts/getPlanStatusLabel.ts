import { Translator } from './Translator';

export function getPlanStatusLabel(status: string, t: Translator): string {
  if (status === 'in_progress') return t('plan.status.inProgress');
  if (status === 'done') return t('plan.status.done');
  if (status === 'blocked') return t('plan.status.blocked');
  if (status === 'pending') return t('plan.status.pending');
  return status;
}
