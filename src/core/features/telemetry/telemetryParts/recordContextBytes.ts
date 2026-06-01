import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordContextBytes(draft: AgentRunTelemetryDraft | undefined, bytes: number): void {
  if (!draft || draft.contextBytes || !Number.isFinite(bytes)) {
    return;
  }

  draft.contextBytes = Math.max(0, Math.round(bytes));
}
