import type { ChatMessageUsageEstimate } from '../../../types';

/**
 * Что это: форматирование количества токенов в компактный вид.
 * Зачем нужно: 12800 токенов отображается как «12.8K tok», 1500000 как «1.5M tok».
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

/**
 * Что это: форматирование стоимости в долларах.
 * Зачем нужно: очень малые стоимости (< $0.0001) показываются с 6 знаками, остальные с 4.
 */
export function formatCost(costUsd: number): string {
  if (costUsd === 0) return '$0.00';
  return costUsd < 0.0001 ? `~$${costUsd.toFixed(6)}` : `~$${costUsd.toFixed(4)}`;
}

/**
 * Что это: извлечение текстовой метки usage из объекта ChatMessageUsageEstimate.
 * Зачем нужно: единая точка форматирования для inline-лейбла и pill-бейджа.
 */
export function getUsageLabel(usage?: ChatMessageUsageEstimate): string | undefined {
  const tokens = usage?.tokens || (usage?.promptTokens || 0) + (usage?.completionTokens || 0);
  const cost = usage?.costUsd !== undefined ? formatCost(usage.costUsd) : '';
  const tokenText = tokens ? `${formatTokens(tokens)} tok` : '';
  const label = [tokenText, cost].filter(Boolean).join(' · ');

  return label || undefined;
}

/**
 * Что это: дополнение числа до двух цифр ведущим нулём.
 * Зачем нужно: время «9:5» должно отображаться как «09:05».
 */
export function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}
