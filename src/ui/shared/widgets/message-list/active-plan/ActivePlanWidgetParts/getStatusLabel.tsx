import { useI18n } from '../../../../i18n';
import { type ChatPlanItemStatus } from '../../../../types';

export function getStatusLabel(status: ChatPlanItemStatus, t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'in_progress') {
    return t('plan.status.inProgress');
  }
  if (status === 'done') {
    return t('plan.status.done');
  }
  if (status === 'blocked') {
    return t('plan.status.blocked');
  }
  return t('plan.status.pending');
}
