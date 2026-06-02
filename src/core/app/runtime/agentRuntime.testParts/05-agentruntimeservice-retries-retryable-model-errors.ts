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
  it('retries retryable model errors and preserves model request status detail', async () => {
    const harness = createHarness({
      modelResponses: [
        new ModelRequestError({
          provider: 'openrouter',
          model: 'test-model',
          endpoint: 'https://example.invalid/chat',
          method: 'POST',
          status: 503,
          statusText: 'Service Unavailable',
          responseBody: 'temporary outage'
        }),
        { role: 'assistant', content: 'Recovered.' }
      ]
    });

    await harness.runtime.ask('chat-1', 'Retry please');

    const requests = harness.events
      .filter(
        (event): event is Extract<RuntimeEvent, { type: 'model.request.updated' }> =>
          event.type === 'model.request.updated'
      )
      .map((event) => event.request);
    expect(requests.map((request) => request.phase)).toEqual(
      expect.arrayContaining(['sending', 'failed', 'retrying', 'completed'])
    );
    expect(requests.find((request) => request.phase === 'failed')).toMatchObject({
      httpStatus: 503,
      httpStatusText: 'Service Unavailable',
      retryable: true
    });
    expect(harness.chat.messages.at(-1)).toMatchObject({ role: 'assistant', content: 'Recovered.' });
  });
});
