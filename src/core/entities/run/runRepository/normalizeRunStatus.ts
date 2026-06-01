import type { AgentRunStatus } from '../../../shared/types/types';

const RUN_STATUSES: readonly AgentRunStatus[] = [
  'running',
  'waitingForApproval',
  'stopping',
  'completed',
  'failed',
  'stopped'
];

/**
 * Что это: приводит произвольный статус к поддерживаемому статусу run.
 * Зачем нужно: persisted-файлы могут быть старее текущей версии клиента.
 * Какую проблему решает: UI не падает на неизвестном статусе и показывает безопасный running fallback.
 */
export function normalizeRunStatus({ status }: { status: unknown }): AgentRunStatus {
  return RUN_STATUSES.includes(status as AgentRunStatus) ? (status as AgentRunStatus) : 'running';
}
