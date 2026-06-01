import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordRepeatedToolCall(draft: AgentRunTelemetryDraft | undefined): void {
  if (!draft) {
    return;
  }

  draft.repeatedToolCalls += 1;
}
