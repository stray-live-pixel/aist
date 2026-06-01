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
  it('runs a successful model-only request and emits persisted events', async () => {
    const harness = createHarness({
      modelResponses: [{ role: 'assistant', content: 'Done.', usage: { promptTokens: 2, completionTokens: 3 } }]
    });

    const result = await harness.runtime.ask('chat-1', 'Hello');

    expect(result).toEqual({ accepted: true, runId: 'run-1' });
    expect(harness.chat.messages.map((message) => [message.role, message.content])).toEqual([
      ['user', 'Hello'],
      ['assistant', 'Done.']
    ]);
    expect(harness.chat.history.some((message) => message.role === 'system')).toBe(false);
    expect(harness.chat.lastAnswer).toBe('Done.');
    expect(harness.chat.busy).toBe(false);
    expect(harness.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'run.started',
        'message.appended',
        'model.request.updated',
        'model.response',
        'run.finished'
      ])
    );
    expect(harness.events.at(-1)).toMatchObject({ type: 'run.finished', status: 'completed', answer: 'Done.' });
  });
});
