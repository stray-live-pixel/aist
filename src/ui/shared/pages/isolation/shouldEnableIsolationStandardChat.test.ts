import { describe, expect, it } from 'vitest';

import type { IsolationSessionSummary, IsolationSessionStatus } from '../../types';
import { shouldEnableIsolationStandardChat } from './shouldEnableIsolationStandardChat';

/**
 * Что это: regression-тест доступности кнопки Open standard chat на странице isolated agents.
 * Зачем нужно: активный Docker-агент должен быть наблюдаем через обычный чат даже при задержке поля chatId в summary.
 * Какую продуктовую проблему решает: пользователь может открыть live-чат и понять, что делает агент во время выполнения.
 */
describe('shouldEnableIsolationStandardChat', () => {
  it('enables the button for active sessions even before chatId reaches the UI state', () => {
    expect(shouldEnableIsolationStandardChat({ session: createSession({ status: 'running_agent' }) })).toBe(true);
  });

  it('enables the button for completed sessions with a known standard chat id', () => {
    expect(
      shouldEnableIsolationStandardChat({
        session: createSession({ status: 'ready_for_review', chatId: 'isolation-session-1' })
      })
    ).toBe(true);
  });

  it('keeps inactive sessions without chatId disabled because there is no chat to open', () => {
    expect(shouldEnableIsolationStandardChat({ session: createSession({ status: 'failed' }) })).toBe(false);
  });
});

function createSession({
  status,
  chatId
}: {
  status: IsolationSessionStatus;
  chatId?: string;
}): IsolationSessionSummary {
  return {
    sessionId: 'session-1',
    taskId: 'task-1',
    chatId,
    prompt: 'Implement isolated task',
    branchName: 'aist/task/task-1',
    provider: 'docker-local',
    status,
    attempt: 1,
    createdAt: 1,
    updatedAt: 2
  };
}
