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
import { Harness } from './Harness';
import { HarnessOptions } from './HarnessOptions';
import { InMemoryRuntimeChatRepository } from './InMemoryRuntimeChatRepository';
import { createChat } from './createChat';
import { createModelClient } from './createModelClient';

export function createHarness(options: HarnessOptions = {}): Harness {
  const chat = createChat();
  const repository = new InMemoryRuntimeChatRepository(chat);
  const events: RuntimeEvent[] = [];
  const registry = new DefaultToolRegistry({
    discoverProjectTools: async () => ({
      tools: [],
      diagnostics: [],
      digest: '0'.repeat(64),
      version: 'test'
    })
  });
  const filesystemExecute = vi.fn(async () => ({ ok: true, stdout: 'ran\n' }));
  const modelClient = options.modelClient || createModelClient(options.modelResponses || []);
  let runIndex = 0;
  let now = 1000;
  const deps: AgentRuntimeServiceDeps = {
    chatRepository: repository,
    modelClient,
    toolRegistry: registry,
    handleToolCall: async (params) => {
      const runner = new ToolRunner({
        registry,
        context: params.context,
        approvalService: {
          getPermission: () => (options.approvalDecision ? 'ask' : 'auto'),
          requestApproval: vi.fn(async () => options.approvalDecision || { approved: true, continueAfterDeny: false })
        },
        filesystem: {
          execute: filesystemExecute
        },
        events: params.events,
        getRunId: () => params.runId,
        now: () => now++
      });
      await runner.handleToolCall(params);
    },
    configProvider: {
      getSnapshot: () => ({ maxToolIterations: 5, streamingEnabled: false })
    },
    promptProvider: {
      getSystemPrompt: () => 'System prompt'
    },
    contextProviders:
      options.memoryContextBlock || options.memoryContextProvider
        ? {
            getMemoryContextBlock: () => options.memoryContextProvider?.() ?? options.memoryContextBlock
          }
        : undefined,
    modelCatalog: {
      getOption: () => ({
        id: 'test-model',
        name: 'Test model',
        provider: 'openrouter',
        supportsTools: true,
        pricing: { prompt: 1, completion: 2 },
        contextLength: 100
      })
    },
    skillProvider: {
      getSkills: () => []
    },
    workspaceRootProvider: {
      getWorkspaceRoot: () => '/tmp/aist-test-workspace'
    },
    eventSink: {
      emit: (event) => {
        events.push(event);
      }
    },
    logger: {
      info: vi.fn(),
      error: vi.fn()
    },
    idFactory: () => `run-${++runIndex}`,
    now: () => now++
  };

  return {
    chat,
    events,
    runtime: new AgentRuntimeService(deps),
    filesystemExecute
  };
}
