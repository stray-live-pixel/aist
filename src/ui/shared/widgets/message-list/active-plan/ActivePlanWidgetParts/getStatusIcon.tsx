import { CheckCircle2, Circle, CircleDot, PauseCircle } from 'lucide-react';

import { type ChatPlanItemStatus } from '../../../../shared/types';

export function getStatusIcon(status: ChatPlanItemStatus) {
  if (status === 'done') {
    return <CheckCircle2 size={11} />;
  }
  if (status === 'in_progress') {
    return <CircleDot size={11} />;
  }
  if (status === 'blocked') {
    return <PauseCircle size={11} />;
  }
  return <Circle size={11} />;
}
