import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';
import { isEditTool } from './isEditTool';

export function recordToolStarted(draft: AgentRunTelemetryDraft | undefined, toolName: string, now = Date.now()): void {
  if (!draft || !isEditTool(toolName) || draft.firstEditLatencyMs !== undefined) {
    return;
  }

  draft.firstEditLatencyMs = Math.max(0, now - draft.startedAt);
}
