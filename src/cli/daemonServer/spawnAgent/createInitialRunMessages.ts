import type { ChatMessage } from '../../../core/shared/types/types';

/**
 * Что это: создаёт стартовую историю SubagentRun.
 * Зачем нужно: пользователь видит, какая задача была отдана помощнику ещё до завершения модели.
 * Какую продуктовую проблему решает: фоновые делегации прозрачны и не выглядят как скрытая активность.
 */
export function createInitialRunMessages({
  runId,
  parentChatId,
  startedAt,
  title,
  prompt
}: {
  runId: string;
  parentChatId: string;
  startedAt: number;
  title: string;
  prompt: string;
}): ChatMessage[] {
  return [
    {
      id: `${runId || 'pending'}-start`,
      role: 'subagent',
      status: 'running',
      content: `${title}: задача запущена.\n\n${prompt}`,
      subagentRunId: runId,
      subagentKind: 'agent.task',
      subagent: { runId, kind: 'agent.task', title },
      createdAt: startedAt,
      result: { ok: true, parentChatId, stage: 'running' }
    }
  ];
}
