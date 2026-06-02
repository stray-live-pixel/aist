import type { AgentRun } from '../../../../shared/types/types';

/**
 * Что это: проверяет остановку run и прерывает сценарий.
 * Зачем нужно: tool/model loop регулярно уважает user stop.
 * Какую продуктовую проблему решает: отмена пользователя быстро завершает активные шаги.
 */
export function throwIfStopped({ run }: { run: AgentRun<unknown> }): void {
  if (run.stopRequested) {
    throw new Error('Stopped by user.');
  }
}
