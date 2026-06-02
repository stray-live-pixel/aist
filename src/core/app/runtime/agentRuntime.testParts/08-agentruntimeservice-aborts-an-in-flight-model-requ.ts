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
  it('aborts an in-flight model request on stop', async () => {
    let modelStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      modelStarted = resolve;
    });
    const harness = createHarness({
      modelClient: {
        chat: vi.fn((_messages, _tools, _model, signal) => {
          modelStarted();
          return new Promise<OpenRouterMessage>((_resolve, reject) => {
            signal?.addEventListener('abort', () => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            });
          });
        })
      }
    });

    const runPromise = harness.runtime.ask('chat-1', 'Slow request');
    await started;
    harness.runtime.stop();
    await runPromise;

    expect(harness.chat.messages.at(-1)).toMatchObject({ role: 'status', marker: 'stopped' });
    expect(harness.chat.modelRequest).toMatchObject({ phase: 'aborted' });
    expect(harness.events.at(-1)).toMatchObject({ type: 'run.finished', status: 'stopped' });
  });
});
