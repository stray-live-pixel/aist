import type { SelectSize } from './types';

/**
 * Что это: оценивает высоту dropdown до render/scroll.
 * Зачем нужно: позиционирование выбирает top/bottom и maxHeight без layout jump.
 * Какую продуктовую проблему решает: Select открывается в доступном месте даже в узких webview/sidebar.
 */
export function getEstimatedDropdownHeight({
  optionCount,
  searchable,
  size,
  categoryCount = 0
}: {
  optionCount: number;
  searchable: boolean;
  size: SelectSize;
  categoryCount?: number;
}): number {
  const padding = 8;
  const searchHeight = searchable ? (size === 'sm' ? 32 : 34) : 0;
  const optionsGap = searchable ? 4 : 0;
  const optionHeight = 27;
  const categoryHeight = 26;
  const emptyHeight = 32;
  return (
    padding +
    searchHeight +
    optionsGap +
    categoryCount * categoryHeight +
    Math.max(optionCount, 1) * (optionCount ? optionHeight : emptyHeight)
  );
}
