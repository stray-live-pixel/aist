import type { IsolationSessionStatus } from '../../types';

/**
 * Что это: общий список активных статусов isolated Docker-сессии.
 * Зачем нужно: разные страницы UI одинаково решают, можно ли продолжать, остановить или только наблюдать run.
 * Какую продуктовую проблему решает: кнопки standard chat и страницы логов не расходятся по поведению для одного статуса.
 */
export function isIsolationSessionActive({ status }: { status: IsolationSessionStatus }): boolean {
  return (
    status === 'queued' ||
    status === 'preparing' ||
    status === 'creating' ||
    status === 'running_agent' ||
    status === 'post_processing' ||
    status === 'committing' ||
    status === 'pushing' ||
    status === 'creating_pr' ||
    status === 'stopping'
  );
}
