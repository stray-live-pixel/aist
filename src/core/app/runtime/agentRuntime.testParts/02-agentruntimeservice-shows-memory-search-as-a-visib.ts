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
  it('shows memory search as a visible tool call before the main model request', async () => {
    const order: string[] = [];
    const modelClient = {
      chat: vi.fn(async () => {
        order.push('main-model');
        return { role: 'assistant' as const, content: 'Checked.' };
      })
    };
    const harness = createHarness({
      memoryContextProvider: () => {
        order.push('memory-subagent');
        expect(harness.chat.messages.map((message) => [message.role, message.name, message.status])).toEqual([
          ['user', undefined, undefined],
          ['tool', 'get_relevant_memory', 'running']
        ]);
        return ['Relevant memory notes:', '- project: Проверять через npm run typecheck'].join('\n');
      },
      modelClient
    });

    await harness.runtime.ask('chat-1', 'Проверь изменения');

    expect(order).toEqual(['memory-subagent', 'main-model']);
    expect(harness.chat.messages.map((message) => [message.role, message.name, message.content])).toEqual([
      ['user', undefined, 'Проверь изменения'],
      ['tool', 'get_relevant_memory', undefined],
      ['assistant', undefined, 'Checked.']
    ]);
    expect(harness.chat.messages[1]).toMatchObject({
      status: 'done',
      reason: expect.stringContaining('релевантные заметки памяти'),
      nextStep: expect.stringContaining('основной агент'),
      args: { query: 'Проверь изменения' },
      result: expect.objectContaining({
        source: 'user-approved-memory',
        found: true,
        noteCount: 1,
        notes: expect.stringContaining('Проверять через npm run typecheck')
      })
    });
    expect(
      harness.chat.history.some(
        (message) => message.role === 'tool' && message.content?.includes('user-approved-memory')
      )
    ).toBe(true);
  });
});
