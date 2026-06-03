import { describe, expect, it } from 'vitest';

import type { RuntimeEvent } from '../../../../core/shared/types/types';
import { applyRuntimeEventToChat } from './applyRuntimeEventToChat';

/**
 * Что это: regression-тест синхронизации контейнерных runtime events в локальный чат.
 * Зачем нужно: autonomous Docker больше не монтирует локальный worktree, поэтому UI живёт только за счёт event bridge.
 * Какую продуктовую проблему решает: пользователь видит сообщения remote/isolated агента в стандартном чате.
 */
describe('applyRuntimeEventToChat', () => {
  it('rebases container chat id and persists appended messages locally', async () => {
    const appended: unknown[] = [];
    const server = {
      chatRepository: {
        appendMessage: async (chatId: string, message: unknown) => appended.push({ chatId, message }),
        updateMessage: async () => undefined,
        setModelRequest: async () => undefined,
        setActivity: async () => undefined,
        setLastAnswer: async () => undefined,
        setBusy: async () => undefined
      }
    } as never;
    const event: RuntimeEvent = {
      type: 'message.appended',
      chatId: 'container-chat',
      message: { id: 'message-1', role: 'assistant', content: 'Done', createdAt: 100 },
      at: 100
    };

    const rebased = await applyRuntimeEventToChat({ server, event, localChatId: 'local-chat' });

    expect(rebased).toMatchObject({ type: 'message.appended', chatId: 'local-chat' });
    expect(appended).toEqual([
      {
        chatId: 'local-chat',
        message: { id: 'message-1', role: 'assistant', content: 'Done', createdAt: 100 }
      }
    ]);
  });

  it('rebases nested run chat id for finished events and clears busy state', async () => {
    const calls: unknown[] = [];
    const server = {
      chatRepository: {
        appendMessage: async () => undefined,
        updateMessage: async () => undefined,
        setModelRequest: async () => undefined,
        setActivity: async (chatId: string, activity: string, detail: string | undefined) =>
          calls.push(['activity', chatId, activity, detail]),
        setLastAnswer: async (chatId: string, answer: string) => calls.push(['answer', chatId, answer]),
        setBusy: async (chatId: string, busy: boolean) => calls.push(['busy', chatId, busy])
      }
    } as never;
    const event: RuntimeEvent = {
      type: 'run.finished',
      run: { id: 'run-1', chatId: 'container-chat', status: 'completed', startedAt: 1, finishedAt: 2 },
      status: 'completed',
      answer: 'Final answer',
      at: 2
    };

    const rebased = await applyRuntimeEventToChat({ server, event, localChatId: 'local-chat' });

    expect(rebased).toMatchObject({ type: 'run.finished', run: { chatId: 'local-chat' } });
    expect(calls).toEqual([
      ['answer', 'local-chat', 'Final answer'],
      ['activity', 'local-chat', 'idle', undefined],
      ['busy', 'local-chat', false]
    ]);
  });
});
