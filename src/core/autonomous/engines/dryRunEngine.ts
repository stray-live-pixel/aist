import { createAutonomousEvent } from '../storage/sessionStore';
import type { AutonomousEngine } from './types';

/**
 * Что это: synthetic engine для проверки discovery/orchestration/UI без внешних
 * CLI, ключей и записи кода. Почему не мок в тестах: dry-run — пользовательская
 * MVP-функция, которая должна работать из dashboard на реальных definitions.
 */
export function createDryRunEngine(): AutonomousEngine {
  return {
    id: 'dry-run',
    label: 'Dry run',
    capabilities: { resume: true, fork: true, tools: false },
    async run(request) {
      if (request.signal.aborted) {
        throw new Error('Dry-run stage aborted.');
      }

      await request.onEvent(
        createAutonomousEvent('DRY', `Dry-run stage ${request.stageIndex ?? 0} started.`, {
          stageIndex: request.stageIndex,
          data: { promptLength: request.prompt.length, model: request.model }
        })
      );

      const result = [
        `Dry-run result for stage ${request.stageIndex ?? 0}.`,
        request.sessionRef ? `Resumed from ${request.sessionRef}.` : undefined,
        request.forkFromSessionRef ? `Forked from ${request.forkFromSessionRef}.` : undefined,
        `Prompt chars: ${request.prompt.length}.`
      ]
        .filter(Boolean)
        .join('\n');

      await request.onEvent(
        createAutonomousEvent('ASSISTANT', result, { stageIndex: request.stageIndex, data: { dryRun: true } })
      );

      return { result, sessionRef: `dry-${request.stageIndex ?? 0}-${Date.now().toString(36)}` };
    }
  };
}
