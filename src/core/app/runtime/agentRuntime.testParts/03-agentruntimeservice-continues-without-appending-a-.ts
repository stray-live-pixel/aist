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
  it('continues without appending a user message when skipUserMessage is enabled', async () => {
    const modelClient = {
      chat: vi.fn(async () => ({ role: 'assistant' as const, content: 'Continued.' }))
    };
    const harness = createHarness({ modelClient });
    harness.chat.history = [{ role: 'assistant', content: 'Previous answer.' }];

    const result = await harness.runtime.ask('chat-1', 'Continue working. Continue with the current task', {
      skipUserMessage: true
    });

    expect(result).toEqual({ accepted: true, runId: 'run-1' });
    expect(harness.chat.messages.map((message) => [message.role, message.content])).toEqual([
      ['assistant', 'Continued.']
    ]);
    expect(modelClient.chat).toHaveBeenCalledWith(
      expect.arrayContaining([{ role: 'user', content: 'Continue working. Continue with the current task' }]),
      expect.any(Array),
      'test-model',
      expect.any(AbortSignal),
      undefined,
      expect.any(Object),
      { reasoningEffort: 'auto', codexServiceTier: 'auto' }
    );
    expect(harness.chat.history.some((message) => message.role === 'user')).toBe(false);
  });
});
