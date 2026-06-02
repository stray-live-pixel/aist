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

export function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false
  };
}
