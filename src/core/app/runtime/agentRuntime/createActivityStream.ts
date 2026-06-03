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
  let lastSentDetail: string | undefined;

  const flush = ({ force = false }: { force?: boolean } = {}) => {
    const currentTime = now();
    if (!force && currentTime - lastUpdateAt < 250) {
      return;
    }

    const reasoningPreview = normalizeActivityPreview({ value: reasoning });
    const contentPreview = normalizeActivityPreview({ value: content });
    const nextDetail = reasoningPreview
      ? text.reasoning(reasoningPreview)
      : contentPreview
        ? text.answerDraft(contentPreview)
        : undefined;

    if (!nextDetail || nextDetail === lastSentDetail) {
      return;
    }

    lastUpdateAt = currentTime;
    lastSentDetail = nextDetail;
    if (reasoningPreview) {
      setActivityDetail(nextDetail);
    } else {
      setActivity('answering', nextDetail);
    }
  };

  return {
    reset: () => {
      reasoning = '';
      content = '';
      lastUpdateAt = 0;
      lastSentDetail = undefined;
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
