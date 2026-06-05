import { useI18n } from '../../../../shared/i18n';

export function getPlanStatusLabel(status: string, t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'in_progress') return t('plan.status.inProgress');
  if (status === 'done') return t('plan.status.done');
  if (status === 'blocked') return t('plan.status.blocked');
  if (status === 'pending') return t('plan.status.pending');
  return status;
}
