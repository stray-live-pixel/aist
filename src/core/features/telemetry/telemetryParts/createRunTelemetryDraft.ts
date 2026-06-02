import { randomUUID } from 'node:crypto';

import { type Chat } from '../../../shared/types/types';
import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';

export function createRunTelemetryDraft(chat: Chat, startedAt = Date.now()): AgentRunTelemetryDraft {
  return {
    runId: randomUUID(),
    chatId: chat.id,
    model: chat.model,
    startedAt,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    modelRequestCount: 0,
    toolCallCount: 0,
    toolCallsByType: {},
    repeatedToolCalls: 0,
    failedEdits: 0,
    approvals: { requested: 0, approved: 0, denied: 0 },
    contextBytes: 0
  };
}
