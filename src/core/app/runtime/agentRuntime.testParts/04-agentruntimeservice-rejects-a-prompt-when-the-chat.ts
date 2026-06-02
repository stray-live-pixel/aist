import { describe, expect, it, vi } from 'vitest';

import { ModelRequestError } from '../../../entities/model/modelErrors';
import type { ModelClient } from '../../../entities/model/modelTransport';
import { DefaultToolRegistry } from '../../../features/tool-execution/toolRegistry';
import { ToolRunner } from '../../../features/tool-execution/toolRunner';
import type {
  Chat,
  ChatMessage,
  ChatModelRequestStatus,
  ChatUsageEstimate,
  OpenRouterMessage,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolCall
} from '../../../shared/types/types';
import { type AgentRuntimeChatRepository, AgentRuntimeService, type AgentRuntimeServiceDeps } from '../agentRuntime';
import {
  Harness,
  HarnessOptions,
  createChat,
  createHarness,
  createModelClient,
  createModelSettings,
  createToolCall
} from './helpers';

describe('AgentRuntimeService', () => {
  it('rejects a prompt when the chat already has an active run', async () => {
    const modelClient = { chat: vi.fn(async () => ({ role: 'assistant' as const, content: 'unused' })) };
    const harness = createHarness({ modelClient });
    harness.chat.busy = true;

    const result = await harness.runtime.ask('chat-1', 'Second prompt');

    expect(result).toEqual({
      accepted: false,
      error: { message: 'Chat already has an active run.', code: 'run.busy' }
    });
    expect(modelClient.chat).not.toHaveBeenCalled();
  });
});
