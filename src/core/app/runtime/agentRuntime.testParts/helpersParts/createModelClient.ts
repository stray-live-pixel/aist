import { describe, expect, it, vi } from 'vitest';

import { ModelRequestError } from '../../../../entities/model/modelErrors';
import type { ModelClient } from '../../../../entities/model/modelTransport';
import { DefaultToolRegistry } from '../../../../features/tool-execution/toolRegistry';
import { ToolRunner } from '../../../../features/tool-execution/toolRunner';
import type {
  Chat,
  ChatMessage,
  ChatModelRequestStatus,
  ChatUsageEstimate,
  OpenRouterMessage,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolCall
} from '../../../../shared/types/types';
import { type AgentRuntimeChatRepository, AgentRuntimeService, type AgentRuntimeServiceDeps } from '../../agentRuntime';

export function createModelClient(responses: Array<OpenRouterMessage | Error>): ModelClient {
  const queue = [...responses];
  return {
    chat: vi.fn(async () => {
      const next = queue.shift();
      if (next instanceof Error) {
        throw next;
      }
      if (!next) {
        throw new Error('Unexpected model request.');
      }
      return next;
    })
  };
}
