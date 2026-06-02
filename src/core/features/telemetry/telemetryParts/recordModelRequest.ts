import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordModelRequest(draft: AgentRunTelemetryDraft | undefined): void {
  if (!draft) {
    return;
  }

  draft.modelRequestCount += 1;
}
