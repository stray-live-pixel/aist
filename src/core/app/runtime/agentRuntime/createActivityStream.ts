import type { AgentActivityStream, Chat } from '../../../shared/types/types';
import { normalizeActivityPreview } from './textDetails';
import type { AgentRuntimeText } from './types';

/**
 * Что это: создаёт накопитель streaming reasoning/content для activity в чате.
 * Зачем нужно: model stream приходит частыми delta, а UI нужно обновлять коротким throttled preview.
 * Какую продуктовую проблему решает: пользователь видит прогресс ответа без спама событий и перегрузки webview.
 */
export function createActivityStream({
  now,
  text,
  setActivity,
  setActivityDetail
}: {
  now: () => number;
  text: AgentRuntimeText;
  setActivity(activity: Chat['activity'], detail?: string): void;
  setActivityDetail(detail: string | undefined): void;
}): AgentActivityStream {
  let reasoning = '';
  let content = '';
  let lastUpdateAt = 0;

  const flush = ({ force = false }: { force?: boolean } = {}) => {
    const currentTime = now();
    if (!force && currentTime - lastUpdateAt < 120) {
      return;
    }

    lastUpdateAt = currentTime;
    const reasoningPreview = normalizeActivityPreview({ value: reasoning });
    const contentPreview = normalizeActivityPreview({ value: content });
    if (reasoningPreview) {
      setActivityDetail(text.reasoning(reasoningPreview));
    } else if (contentPreview) {
      setActivity('answering', text.answerDraft(contentPreview));
    }
  };

  return {
    reset: () => {
      reasoning = '';
      content = '';
      lastUpdateAt = 0;
    },
    hasContent: () =>
      Boolean(normalizeActivityPreview({ value: reasoning }) || normalizeActivityPreview({ value: content })),
    onComplete: () => flush({ force: true }),
    onReasoningDelta: (delta) => {
      reasoning += delta;
      flush();
    },
    onContentDelta: (delta) => {
      content += delta;
      flush();
    }
  };
}
