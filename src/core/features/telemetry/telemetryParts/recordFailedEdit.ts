import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';
import { isEditTool } from './isEditTool';

export function recordFailedEdit(draft: AgentRunTelemetryDraft | undefined, toolName: string): void {
  if (!draft || !isEditTool(toolName)) {
    return;
  }

  draft.failedEdits += 1;
}
