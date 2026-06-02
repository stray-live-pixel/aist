import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordApprovalDecision(draft: AgentRunTelemetryDraft | undefined, approved: boolean): void {
  if (!draft) {
    return;
  }

  if (approved) {
    draft.approvals.approved += 1;
  } else {
    draft.approvals.denied += 1;
  }
}
