import { describe, expect, it, vi } from 'vitest';

import type { Chat, ChatModelRequestStatus, RuntimeEvent } from '../../../shared/types/types';
import { setActivityDetail } from './actions/setActivityDetail';
import { updateModelRequest } from './actions/updateModelRequest';
import type { AgentRuntimeContext } from './context';
import { createActivityStream } from './createActivityStream';
import { defaultRuntimeText } from './defaultRuntimeText';

/**
 * Что это: regression-тесты coalescing/no-op защиты progress-событий runtime.
 * Зачем нужно: streaming может присылать частые одинаковые delta, но UI и storage должны получать только полезные изменения.
 * Какую продуктовую проблему решает: параллельные агенты остаются живыми без лавины одинаковых state writes и daemon events.
 */
describe('runtime progress throttling', () => {
  it('coalesces fast content deltas and still sends final update on complete', () => {
    let now = 1000;
    const setActivity = vi.fn();
    const setActivityDetail = vi.fn();
    const stream = createActivityStream({
      now: () => now,
      text: defaultRuntimeText,
      setActivity,
      setActivityDetail
    });

    stream.onContentDelta?.('Hello');
    now += 100;
    stream.onContentDelta?.(' world');
    now += 100;
    stream.onContentDelta?.('!');

    expect(setActivity).toHaveBeenCalledTimes(1);

    stream.onComplete?.();

    expect(setActivity).toHaveBeenCalledTimes(2);
    expect(setActivity.mock.calls[1][1]).toContain('Hello world!');
  });

  it('does not send duplicate detail twice', () => {
    let now = 1000;
    const setActivity = vi.fn();
    const stream = createActivityStream({
      now: () => now,
      text: defaultRuntimeText,
      setActivity,
      setActivityDetail: vi.fn()
    });

    stream.onContentDelta?.('Same');
    now += 300;
    stream.onContentDelta?.('');
    stream.onComplete?.();

    expect(setActivity).toHaveBeenCalledTimes(1);
  });

  it('skips repository write and event when activity detail is unchanged', async () => {
    const context = createContext({ chat: createChat({ activityDetail: 'Same detail' }) });

    await setActivityDetail({ context, runId: 'run-1', chatId: 'chat-1', detail: 'Same detail' });

    expect(context.deps.chatRepository.setActivityDetail).not.toHaveBeenCalled();
    expect(context.deps.runRepository?.appendEvent).not.toHaveBeenCalled();
    expect(context.deps.eventSink?.emit).not.toHaveBeenCalled();
  });

  it('skips model request write and event when patch is no-op', async () => {
    const request = createModelRequest({ phase: 'sending' });
    const context = createContext({ chat: createChat({ modelRequest: request }) });

    await updateModelRequest({ context, runId: 'run-1', chatId: 'chat-1', patch: { phase: 'sending' } });

    expect(context.deps.chatRepository.updateModelRequest).not.toHaveBeenCalled();
    expect(context.deps.runRepository?.appendEvent).not.toHaveBeenCalled();
    expect(context.deps.eventSink?.emit).not.toHaveBeenCalled();
  });

  it('writes and emits when model request patch changes a field', async () => {
    const request = createModelRequest({ phase: 'sending' });
    const nextRequest = { ...request, phase: 'receiving' as const };
    const context = createContext({ chat: createChat({ modelRequest: request }) });
    vi.mocked(context.deps.chatRepository.updateModelRequest).mockResolvedValue(nextRequest);

    await updateModelRequest({ context, runId: 'run-1', chatId: 'chat-1', patch: { phase: 'receiving' } });

    expect(context.deps.chatRepository.updateModelRequest).toHaveBeenCalledWith('chat-1', { phase: 'receiving' });
    expect(context.deps.runRepository?.appendEvent).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ type: 'model.request.updated', request: nextRequest })
    );
    expect(context.deps.eventSink?.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'model.request.updated', request: nextRequest })
    );
  });
});

function createContext({ chat }: { chat: Chat }): AgentRuntimeContext {
  return {
    deps: {
      chatRepository: {
        getChat: vi.fn(async () => chat),
        appendMessage: vi.fn(),
        updateMessage: vi.fn(),
        setBusy: vi.fn(),
        setActivity: vi.fn(),
        setActivityDetail: vi.fn(),
        setModelRequest: vi.fn(),
        updateModelRequest: vi.fn(),
        setHistory: vi.fn(),
        setLastAnswer: vi.fn(),
        addUsage: vi.fn(),
        setContext: vi.fn(),
        getActivePlan: vi.fn(),
        setActivePlan: vi.fn()
      },
      runRepository: {
        create: vi.fn(),
        appendEvent: vi.fn(async (_runId: string, _event: RuntimeEvent) => undefined)
      },
      modelClient: {} as never,
      toolRegistry: {} as never,
      handleToolCall: vi.fn(),
      eventSink: { emit: vi.fn() },
      configProvider: { getSnapshot: vi.fn() },
      promptProvider: { getSystemPrompt: vi.fn() },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
    },
    activeRunsByChat: new Map(),
    activeRunsById: new Map(),
    now: () => 1000,
    idFactory: () => 'id',
    text: defaultRuntimeText
  } as unknown as AgentRuntimeContext;
}

function createChat({
  activityDetail,
  modelRequest
}: {
  activityDetail?: string;
  modelRequest?: ChatModelRequestStatus;
}): Chat {
  return {
    id: 'chat-1',
    title: 'Chat',
    model: 'model',
    modelSettings: {
      model: 'model',
      reasoningEffort: 'auto',
      codexServiceTier: 'auto',
      maxToolIterations: 0,
      editorContextMode: 'auto',
      streamingEnabled: false,
      toolsDisabled: false
    },
    messages: [],
    history: [],
    lastAnswer: '',
    activity: 'thinking',
    activityDetail,
    modelRequest,
    busy: true,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 1000,
    updatedAt: 1000
  };
}

function createModelRequest({ phase }: { phase: ChatModelRequestStatus['phase'] }): ChatModelRequestStatus {
  return {
    model: 'model',
    attempt: 1,
    maxAttempts: 1,
    requestNumber: 1,
    phase,
    stream: true,
    startedAt: 1000,
    updatedAt: 1000
  };
}
