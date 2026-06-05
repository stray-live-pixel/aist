import { type ChatPlanItemStatus } from '../../../../types';

export function getStatusTone(status: ChatPlanItemStatus): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'done') {
    return 'success';
  }
  if (status === 'in_progress') {
    return 'accent';
  }
  if (status === 'blocked') {
    return 'danger';
  }
  return 'neutral';
}
