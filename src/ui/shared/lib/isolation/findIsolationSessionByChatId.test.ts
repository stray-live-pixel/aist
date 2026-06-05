import { describe, expect, it } from 'vitest';

import type { IsolationSessionSummary } from '../../types';
import { findIsolationSessionByChatId } from './findIsolationSessionByChatId';

/**
 * Что это: regression-тест связи isolated session -> стандартный чат.
 * Зачем нужно: страница чата маршрутизирует follow-up в Docker только если chatId действительно принадлежит сессии.
 * Какую продуктовую проблему решает: обычные локальные чаты не получают случайно isolated-команды.
 */
describe('findIsolationSessionByChatId', () => {
  it('returns the session linked to the active standard chat', () => {
    const session = createSession({ sessionId: 'session-1', chatId: 'chat-1' });

    expect(
      findIsolationSessionByChatId({
        state: { isolationSessions: [session, createSession({ sessionId: 'session-2', chatId: 'chat-2' })] },
        chatId: 'chat-1'
      })
    ).toBe(session);
  });

  it('does not match regular chats without an isolation session', () => {
    expect(
      findIsolationSessionByChatId({
        state: { isolationSessions: [createSession({ sessionId: 'session-1', chatId: 'chat-1' })] },
        chatId: 'regular-chat'
      })
    ).toBeUndefined();
  });

  it('keeps destroyed sessions linked for read-only standard chat history', () => {
    const session = createSession({ sessionId: 'session-1', chatId: 'chat-1' });
    const destroyedSession = { ...session, status: 'destroyed' as const };

    expect(
      findIsolationSessionByChatId({
        state: { isolationSessions: [destroyedSession] },
        chatId: 'chat-1'
      })
    ).toBe(destroyedSession);
  });
});

function createSession({ sessionId, chatId }: { sessionId: string; chatId: string }): IsolationSessionSummary {
  return {
    sessionId,
    taskId: `${sessionId}-task`,
    chatId,
    prompt: 'Implement isolated task',
    branchName: `aist/task/${sessionId}`,
    provider: 'docker-local',
    status: 'running_agent',
    attempt: 1,
    createdAt: 1,
    updatedAt: 2
  };
}
