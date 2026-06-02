import type { ToolPermissionPresetId } from '../../../shared/types';
import type { SelectOption } from '../../../shared/ui';

/**
 * Что это: строит короткие подписи моделей для compact Select.
 * Зачем нужно: длинные provider/model id не разрывают узкий сайдбар VS Code.
 * Какую проблему решает: все селекты модели используют одинаковое сокращение названий.
 */
export function getModelDisplayLabels({ options }: { options: SelectOption[] }): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.value, compactModelLabel({ label: option.label })]));
}

/**
 * Что это: сокращает название модели до читаемой подписи.
 * Зачем нужно: composer показывает модель в одну строку рядом с другими controls.
 * Какую проблему решает: убирает повторяющиеся provider-префиксы и громоздкие бренды.
 */
export function compactModelLabel({ label }: { label: string }): string {
  return label
    .replace(/^openrouter[:/]/i, '')
    .replace(/^anthropic[:/]/i, '')
    .replace(/^openai[:/]/i, '')
    .replace(/^google[:/]/i, '')
    .replace(/^meta-llama[:/]/i, '')
    .replace(/^codex[:/]/i, '')
    .replace(/\bchatgpt\b/gi, 'GPT')
    .replace(/\bclaude\b/gi, 'Cl')
    .replace(/\bgemini\b/gi, 'Gem')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Что это: строит короткие подписи preset разрешений для compact Select.
 * Зачем нужно: пользователь видит режим безопасности без длинных label из settings.
 * Какую проблему решает: custom и встроенные presets отображаются консистентно в composer.
 */
export function getPermissionDisplayLabels({
  options,
  activePresetId
}: {
  options: SelectOption[];
  activePresetId: ToolPermissionPresetId | 'custom';
}): Record<string, string> {
  return Object.fromEntries(
    options.map((option) => [
      option.value,
      compactPermissionLabel({ value: option.value, label: option.label, activePresetId })
    ])
  );
}

/**
 * Что это: сокращает label permission preset до 4-5 символов.
 * Зачем нужно: режим безопасности должен помещаться в нижней строке composer.
 * Какую проблему решает: длинные переводы preset не ломают layout webview.
 */
export function compactPermissionLabel({
  value,
  label,
  activePresetId
}: {
  value: string;
  label: string;
  activePresetId: ToolPermissionPresetId | 'custom';
}): string {
  if (value === 'custom' || activePresetId === 'custom') return 'Custom';
  if (value === 'confirm-all') return 'Ask';
  if (value === 'balanced') return 'Safe';
  if (value === 'fast-edit') return 'Edit';
  if (value === 'autonomous') return 'Auto';
  return label.replace(/\s+/g, '').slice(0, 5) || value.slice(0, 5);
}

/**
 * Что это: форматирует токены в короткий человекочитаемый вид.
 * Зачем нужно: индикатор контекста показывает числа в компактной зоне composer.
 * Какую проблему решает: большие числа не вытесняют остальные элементы управления.
 */
export function formatTokens({ tokens }: { tokens: number }): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return String(tokens);
}

/**
 * Что это: форматирует стоимость текущего чата для summary.
 * Зачем нужно: пользователь быстро видит приблизительный расход без открытия деталей.
 * Какую проблему решает: единообразно округляет маленькие и обычные суммы в UI.
 */
export function formatCost({ costUsd }: { costUsd: number }): string {
  if (costUsd === 0) {
    return '$0.00';
  }

  if (costUsd < 0.0001) {
    return `~$${costUsd.toFixed(6)}`;
  }

  return `~$${costUsd.toFixed(4)}`;
}
