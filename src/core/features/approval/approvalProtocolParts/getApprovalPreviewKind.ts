import { type ApprovalPreviewKind, type ToolExecutionRequirement } from '../../../shared/types/types';

export function getApprovalPreviewKind(requirement: ToolExecutionRequirement): ApprovalPreviewKind {
  if (requirement.mode === 'ui-assisted-preview') {
    return requirement.previewKind;
  }

  if (requirement.mode === 'approval') {
    return requirement.previewKind || 'none';
  }

  return 'none';
}
