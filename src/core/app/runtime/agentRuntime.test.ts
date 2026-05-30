import { describe, expect, it, vi } from 'vitest';

import { ModelRequestError } from '../../entities/model/modelErrors';
import type { ModelClient } from '../../entities/model/modelTransport';
import { DefaultToolRegistry } from '../../features/tool-execution/toolRegistry';
import { ToolRunner } from '../../features/tool-execution/toolRunner';
import type {
  Chat,
  ChatMessage,
  ChatModelRequestStatus,
  ChatUsageEstimate,
  OpenRouterMessage,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolCall
} from '../../shared/types/types';
import { type AgentRuntimeChatRepository, AgentRuntimeService, type AgentRuntimeServiceDeps } from './agentRuntime';

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

  it('shows applied memory as a visible tool message in chat history', async () => {
    const harness = createHarness({
      memoryContextBlock: ['Relevant memory notes:', '- project: Проверять через npm run typecheck'].join('\n'),
      modelResponses: [{ role: 'assistant', content: 'Checked.' }]
    });

    await harness.runtime.ask('chat-1', 'Проверь изменения');

    expect(harness.chat.messages.map((message) => [message.role, message.name, message.content])).toEqual([
      ['user', undefined, 'Проверь изменения'],
      ['tool', 'get_relevant_memory', undefined],
      ['assistant', undefined, 'Checked.']
    ]);
    expect(harness.chat.messages[1]).toMatchObject({
      status: 'done',
      result: expect.objectContaining({
        source: 'user-approved-memory',
        notes: expect.stringContaining('Проверять через npm run typecheck')
      })
    });
    expect(
      harness.chat.history.some(
        (message) => message.role === 'tool' && message.content?.includes('user-approved-memory')
      )
    ).toBe(true);
  });

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

type HarnessOptions = {
  modelResponses?: Array<OpenRouterMessage | Error>;
  modelClient?: ModelClient;
  approvalDecision?: ToolApprovalDecision;
  memoryContextBlock?: string;
};

type Harness = {
  chat: Chat;
  events: RuntimeEvent[];
  runtime: AgentRuntimeService;
  filesystemExecute: ReturnType<typeof vi.fn>;
};

function createHarness(options: HarnessOptions = {}): Harness {
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
    contextProviders: options.memoryContextBlock
      ? {
          getMemoryContextBlock: () => options.memoryContextBlock
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

function createModelClient(responses: Array<OpenRouterMessage | Error>): ModelClient {
  const queue = [...responses];
  return {
    chat: vi.fn(async () => {
      const next = queue.shift();
      if (next instanceof Error) {
        throw next;
      }
      if (!next) {
        throw new Error('Unexpected model request.');
      }
      return next;
    })
  };
}

class InMemoryRuntimeChatRepository implements AgentRuntimeChatRepository {
  private messageIndex = 0;

  constructor(private readonly chat: Chat) {}

  getChat(chatId: string): Chat | undefined {
    return chatId === this.chat.id ? this.chat : undefined;
  }

  appendMessage(_chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const nextMessage = {
      id: `message-${++this.messageIndex}`,
      createdAt: 1000 + this.messageIndex,
      ...message
    };
    this.chat.messages.push(nextMessage);
    return nextMessage;
  }

  updateMessage(
    _chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): ChatMessage {
    const message = this.chat.messages.find((item) => item.id === messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }
    Object.assign(message, patch);
    return message;
  }

  setBusy(_chatId: string, busy: boolean): void {
    this.chat.busy = busy;
  }

  setActivity(_chatId: string, activity: Chat['activity'], detail?: string): void {
    this.chat.activity = activity;
    this.chat.activityDetail = detail;
  }

  setActivityDetail(_chatId: string, detail: string | undefined): void {
    this.chat.activityDetail = detail;
  }

  setModelRequest(_chatId: string, modelRequest: Chat['modelRequest']): void {
    this.chat.modelRequest = modelRequest;
  }

  updateModelRequest(
    _chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): ChatModelRequestStatus | undefined {
    if (!this.chat.modelRequest) {
      return undefined;
    }
    this.chat.modelRequest = { ...this.chat.modelRequest, ...patch };
    return this.chat.modelRequest;
  }

  setHistory(_chatId: string, history: Chat['history']): void {
    this.chat.history = history;
  }

  setLastAnswer(_chatId: string, answer: string): void {
    this.chat.lastAnswer = answer;
  }

  addUsage(_chatId: string, usage: Partial<ChatUsageEstimate>): ChatUsageEstimate {
    this.chat.usage = {
      promptTokens: this.chat.usage.promptTokens + (usage.promptTokens || 0),
      completionTokens: this.chat.usage.completionTokens + (usage.completionTokens || 0),
      totalTokens: this.chat.usage.totalTokens + (usage.totalTokens || 0),
      costUsd:
        this.chat.usage.costUsd === undefined && usage.costUsd === undefined
          ? undefined
          : (this.chat.usage.costUsd || 0) + (usage.costUsd || 0)
    };
    return this.chat.usage;
  }

  setContext(_chatId: string, context: Chat['context']): void {
    this.chat.context = context;
    this.chat.contextLength = context?.tokens;
  }

  getActivePlan(): Chat['activePlan'] {
    return this.chat.activePlan;
  }

  setActivePlan(_chatId: string, activePlan: Chat['activePlan']): void {
    this.chat.activePlan = activePlan;
  }
}

function createChat(): Chat {
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

function createToolCall(name: string, args: Record<string, unknown>, id = `call-${name}`): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: {
        reason: 'test reason',
        nextStep: 'test next step',
        ...args
      }
    }
  };
}

function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false
  };
}
