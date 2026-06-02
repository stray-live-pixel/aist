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
import { createModelSettings } from './createModelSettings';

export function createChat(): Chat {
  return {
    id: 'chat-1',
    title: 'Test chat',
    model: 'test-model',
    modelSettings: createModelSettings('test-model'),
    messages: [],
    history: [],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1000,
    updatedAt: 1000
  };
}
