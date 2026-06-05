import type { CodexServiceTier, ReasoningEffort } from '../../../shared/types';

/**
 * Что это: короткие подписи reasoning-режима для компактного composer UI.
 * Зачем нужно: пользователь видит текущую глубину рассуждений без длинных технических слов.
 * Какую проблему решает: сохраняет единый источник правды для подписи reasoning во всех элементах summary.
 */
export const REASONING_DISPLAY_LABELS: Record<ReasoningEffort, string> = {
  auto: 'Auto',
  low: 'Low',
  medium: 'Med',
  high: 'High',
  xhigh: 'XHigh'
};

/**
 * Что это: короткие подписи Codex service tier для компактного composer UI.
 * Зачем нужно: пользователь быстро понимает выбранную скорость Codex без раскрытия панели.
 * Какую проблему решает: не даёт разным компонентам показывать разные обозначения скорости.
 */
export const CODEX_TIER_DISPLAY_LABELS: Record<CodexServiceTier, string> = {
  auto: '1×',
  priority: '2×'
};
