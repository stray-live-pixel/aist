import type { RuntimeEvent } from '../../../shared/types/types';
import type { RunMetadata } from './types';

/**
 * Что это: переводит runtime event в изменение meta.json запуска.
 * Зачем нужно: список run должен быстро показывать актуальный статус без replay всего журнала.
 * Какую проблему решает: append-only events остаются источником истории, а meta — быстрым индексом состояния.
 */
export function createRunEventMetaPatch({ event }: { event: RuntimeEvent }): Partial<RunMetadata> {
  switch (event.type) {
    case 'run.started':
      return {
        status: event.run.status,
        chatId: event.run.chatId,
        prompt: event.run.prompt,
        model: event.run.model,
        startedAt: event.run.startedAt,
        finishedAt: event.run.finishedAt,
        usage: event.run.usage
      };
    case 'run.activity':
      if (event.activity === 'waitingForApproval') {
        return { status: 'waitingForApproval' };
      }
      if (event.activity === 'stopping') {
        return { status: 'stopping' };
      }
      return {};
    case 'run.completed':
      return {
        status: 'completed',
        chatId: event.run.chatId,
        model: event.run.model,
        finishedAt: event.run.finishedAt || event.at,
        usage: event.usage
      };
    case 'run.failed':
      return {
        status: 'failed',
        chatId: event.chatId,
        finishedAt: event.at,
        error: { message: event.error.message, code: event.error.code }
      };
    case 'run.stopped':
      return { status: 'stopped', chatId: event.chatId, finishedAt: event.at };
    case 'run.finished':
      return {
        status: event.status,
        chatId: event.run.chatId,
        model: event.run.model,
        finishedAt: event.run.finishedAt || event.at,
        usage: event.usage
      };
    case 'run.error':
      return {
        status: 'failed',
        chatId: event.chatId,
        finishedAt: event.at,
        error: { message: event.error.message, code: event.error.code }
      };
    default:
      return {};
  }
}
