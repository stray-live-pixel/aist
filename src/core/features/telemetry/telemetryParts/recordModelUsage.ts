import { type ChatUsageEstimate } from '../../../shared/types/types';
import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function recordModelUsage(
  draft: AgentRunTelemetryDraft | undefined,
  usage: ChatUsageEstimate | undefined
): void {
  if (!draft || !usage) {
    return;
  }

  draft.promptTokens += usage.promptTokens || 0;
  draft.completionTokens += usage.completionTokens || 0;
  draft.totalTokens += usage.totalTokens || 0;
}
