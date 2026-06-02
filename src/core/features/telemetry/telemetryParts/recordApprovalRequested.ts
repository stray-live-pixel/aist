import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordApprovalRequested(draft: AgentRunTelemetryDraft | undefined): void {
  if (!draft) {
    return;
  }

  draft.approvals.requested += 1;
}
