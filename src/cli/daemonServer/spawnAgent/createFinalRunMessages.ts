import type { ChatMessage } from '../../../core/shared/types/types';

/**
 * Что это: создаёт финальную историю SubagentRun.
 * Зачем нужно: детали запуска показывают и старт задачи, и итоговый отчёт.
 * Какую продуктовую проблему решает: пользователь может проверить вклад дочернего агента отдельно от основного чата.
 */
export function createFinalRunMessages({
  runId,
  parentChatId,
  startedAt,
  finishedAt,
  content,
  status
}: {
  runId: string;
  parentChatId: string;
  startedAt: number;
  finishedAt: number;
  content: string;
  status: 'done' | 'error';
}): ChatMessage[] {
  return [
    {
      id: `${runId}-start`,
      role: 'subagent',
      status,
      content: 'Дочерний агент получил задачу.',
      subagentRunId: runId,
      subagentKind: 'agent.task',
      subagent: { runId, kind: 'agent.task', title: 'Дочерний агент' },
      createdAt: startedAt,
      result: { ok: true, parentChatId, stage: 'started' }
    },
    {
      id: `${runId}-finish`,
      role: status === 'error' ? 'error' : 'assistant',
      content,
      createdAt: finishedAt,
      result: { ok: status !== 'error', parentChatId, stage: 'finished' }
    }
  ];
}
