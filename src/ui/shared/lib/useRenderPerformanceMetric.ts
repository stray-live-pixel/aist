import { useEffect, useRef } from 'react';

import { agentActions } from './agentActions';

const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_RENDER_COUNT = 25;

type RenderPerformanceBatch = {
  startedAt: number;
  renderCount: number;
  durationMs: number;
  maxRenderDurationMs: number;
};

/**
 * Что это: батчит локальные render-метрики React-компонента и отправляет их в extension.
 * Зачем нужно: частые ререндеры чата должны быть видны в аналитике, но не должны писать в FS на каждый render.
 * Какую продуктовую проблему решает: можно найти компонент, который лагает UI, без добавления нового источника нагрузки.
 */
export function useRenderPerformanceMetric({
  component,
  chatId,
  messageCount
}: {
  component: string;
  chatId?: string;
  messageCount?: number;
}): void {
  const batchRef = useRef<RenderPerformanceBatch>(createEmptyRenderPerformanceBatch());
  const previousCommitAtRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const committedAt = performance.now();
    const durationMs =
      previousCommitAtRef.current === undefined ? 0 : Math.max(0, committedAt - previousCommitAtRef.current);
    previousCommitAtRef.current = committedAt;

    const batch = batchRef.current;
    if (!batch.startedAt) {
      batch.startedAt = Date.now();
    }
    batch.renderCount += 1;
    batch.durationMs += durationMs;
    batch.maxRenderDurationMs = Math.max(batch.maxRenderDurationMs, durationMs);

    if (batch.renderCount >= FLUSH_RENDER_COUNT) {
      flushRenderPerformanceMetric({ component, chatId, messageCount, batchRef });
      return;
    }

    if (timerRef.current === undefined) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined;
        flushRenderPerformanceMetric({ component, chatId, messageCount, batchRef });
      }, FLUSH_INTERVAL_MS);
    }
  });

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
      flushRenderPerformanceMetric({ component, chatId, messageCount, batchRef });
    };
  }, [chatId, component, messageCount]);
}

function flushRenderPerformanceMetric({
  component,
  chatId,
  messageCount,
  batchRef
}: {
  component: string;
  chatId?: string;
  messageCount?: number;
  batchRef: { current: RenderPerformanceBatch };
}): void {
  const batch = batchRef.current;
  if (!batch.renderCount) {
    return;
  }

  agentActions.reportRenderPerformance({
    component,
    chatId,
    messageCount,
    startedAt: batch.startedAt || Date.now(),
    finishedAt: Date.now(),
    renderCount: batch.renderCount,
    durationMs: Math.round(batch.durationMs),
    maxRenderDurationMs: Math.round(batch.maxRenderDurationMs)
  });

  batchRef.current = createEmptyRenderPerformanceBatch();
}

function createEmptyRenderPerformanceBatch(): RenderPerformanceBatch {
  return { startedAt: 0, renderCount: 0, durationMs: 0, maxRenderDurationMs: 0 };
}
