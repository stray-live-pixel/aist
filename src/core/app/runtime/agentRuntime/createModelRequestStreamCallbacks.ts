import type { ModelStreamCallbacks } from '../../../shared/types/types';
import type { AgentActivityStream } from '../../../shared/types/types';

/**
 * Что это: связывает streaming delta от модели с activity stream агента.
 * Зачем нужно: первый reasoning/content delta переводит request в streaming и обновляет UI-progress.
 * Какую продуктовую проблему решает: пользователь видит живой прогресс вместо статуса ожидания до конца ответа.
 */
export function createModelRequestStreamCallbacks({
  activityStream,
  onStreamStart
}: {
  activityStream: AgentActivityStream;
  onStreamStart: () => void;
}): ModelStreamCallbacks {
  return {
    onComplete: () => activityStream.onComplete?.(),
    onReasoningDelta: (delta) => {
      onStreamStart();
      activityStream.onReasoningDelta?.(delta);
    },
    onContentDelta: (delta) => {
      onStreamStart();
      activityStream.onContentDelta?.(delta);
    }
  };
}
