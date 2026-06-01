import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordToolCalls(draft: AgentRunTelemetryDraft | undefined, toolNames: string[]): void {
  if (!draft) {
    return;
  }

  for (const toolName of toolNames) {
    draft.toolCallCount += 1;
    draft.toolCallsByType[toolName] = (draft.toolCallsByType[toolName] || 0) + 1;
  }
}
