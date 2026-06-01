import type { RuntimeEvent } from '../../../shared/types/types';

/**
 * Что это: достаёт runId из разных форм runtime event.
 * Зачем нужно: часть событий хранит run внутри снимка, а часть — отдельным полем.
 * Какую проблему решает: appendEvent проверяет принадлежность события run без знания всех вариантов event shape.
 */
export function getRuntimeEventRunId({ event }: { event: RuntimeEvent }): string | undefined {
  switch (event.type) {
    case 'run.started':
    case 'run.completed':
    case 'run.finished':
      return event.run.id;
    case 'message.appended':
    case 'chat.updated':
      return undefined;
    default:
      return event.runId;
  }
}
