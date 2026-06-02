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
  it('stops the run after deny-stop and emits a stopped finish event', async () => {
    const harness = createHarness({
      modelResponses: [{ role: 'assistant', content: '', tool_calls: [createToolCall('run_bash_script', {})] }],
      approvalDecision: {
        approved: false,
        continueAfterDeny: false,
        comment: 'Stop here.'
      }
    });

    await harness.runtime.ask('chat-1', 'Stop on denied tool');

    expect(harness.chat.messages.at(-1)).toMatchObject({ role: 'status', marker: 'stopped' });
    expect(harness.events.at(-1)).toMatchObject({ type: 'run.finished', status: 'stopped' });
    expect(harness.chat.busy).toBe(false);
  });
});
