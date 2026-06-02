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
  it('continues the loop after deny-continue with a model-visible denial result', async () => {
    const toolCall = createToolCall('run_bash_script', { script: 'rm -rf tmp' });
    const harness = createHarness({
      modelResponses: [
        { role: 'assistant', content: '', tool_calls: [toolCall] },
        { role: 'assistant', content: 'Continued after denial.' }
      ],
      approvalDecision: {
        approved: false,
        continueAfterDeny: true,
        comment: 'Do not run this.'
      }
    });

    await harness.runtime.ask('chat-1', 'Use a tool');

    const toolMessage = harness.chat.messages.find((message) => message.role === 'tool');
    expect(toolMessage).toMatchObject({
      status: 'denied',
      approval: 'denied',
      userApprovalComment: 'Do not run this.'
    });
    expect(harness.filesystemExecute).not.toHaveBeenCalled();
    expect(harness.chat.messages.at(-1)).toMatchObject({ role: 'assistant', content: 'Continued after denial.' });
    expect(harness.chat.history.at(-2)).toMatchObject({ role: 'tool' });
  });
});
