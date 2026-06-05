import { memo } from 'react';

import { useI18n } from '../../../i18n';
import type { ChatContextEstimate } from '../../../types';
import { ContextUsageIndicator } from '../../../ui';
import { formatTokens } from './formatters';

/**
 * Что это: компактный индикатор заполнения контекста активного чата.
 * Зачем нужно: пользователь видит, насколько близко агент к лимиту контекста.
 * Какую проблему решает: предупреждает о больших диалогах без отдельного экрана статистики.
 */
export const ContextUsage = memo(function ContextUsage({ context }: { context: ChatContextEstimate | undefined }) {
  const { t } = useI18n();
  const tokens = context?.tokens ?? 0;
  const tooltip = formatContextTooltip({ context, fallback: t('common.notAvailable') });

  return (
    <ContextUsageIndicator
      value={tokens}
      percent={clampPercent({ value: context?.percent ?? 0 })}
      tooltip={tooltip}
      formatter={(value) => formatTokens({ tokens: value })}
    />
  );
});

/**
 * Что это: ограничивает процент контекста диапазоном 0..100.
 * Зачем нужно: индикатор получает безопасное значение даже при неполной telemetry.
 * Какую проблему решает: UI не ломается от NaN или ошибочных процентов backend.
 */
function clampPercent({ value }: { value: number }): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

/**
 * Что это: собирает tooltip для индикатора контекста.
 * Зачем нужно: compact pie показывает детали по hover/focus.
 * Какую проблему решает: пользователь видит и токены, и процент без расширения composer.
 */
function formatContextTooltip({
  context,
  fallback
}: {
  context: ChatContextEstimate | undefined;
  fallback: string;
}): string {
  if (!context?.tokens) {
    return fallback;
  }

  const tokens = formatTokens({ tokens: context.tokens });
  const percent = context.percent !== undefined ? `${Math.round(context.percent)}%` : fallback;

  if (!context.maxTokens) {
    return `${tokens} tokens · ${percent}`;
  }

  return `${tokens} of ${formatTokens({ tokens: context.maxTokens })} tokens · ${percent}`;
}
