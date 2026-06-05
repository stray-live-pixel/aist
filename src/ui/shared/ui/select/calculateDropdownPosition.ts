import { getEstimatedDropdownHeight } from './getEstimatedDropdownHeight';
import type { DropdownPlacement, DropdownPosition, SelectSize } from './types';

/**
 * Что это: рассчитывает fixed-позицию dropdown Select.
 * Зачем нужно: portal в document.body должен совпасть с trigger и не вылезать за viewport.
 * Какую продуктовую проблему решает: dropdown удобно открывается вверх/вниз в sidebar, modal и composer controls.
 */
export function calculateDropdownPosition({
  rect,
  size,
  visibleOptionCount,
  searchable,
  groupCount,
  viewport
}: {
  rect: DOMRect;
  size: SelectSize;
  visibleOptionCount: number;
  searchable: boolean;
  groupCount: number;
  viewport: { width: number; height: number };
}): DropdownPosition {
  const gap = size === 'sm' ? 6 : 8;
  const viewportPadding = 12;
  const preferredHeight = Math.min(
    size === 'sm' ? 292 : 320,
    getEstimatedDropdownHeight({ optionCount: visibleOptionCount, searchable, size, categoryCount: groupCount })
  );
  const spaceBelow = viewport.height - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const placement: DropdownPlacement = spaceBelow >= Math.min(preferredHeight, spaceAbove) ? 'bottom' : 'top';
  const availableHeight = Math.max(96, placement === 'bottom' ? spaceBelow - gap : spaceAbove - gap);
  const maxHeight = Math.min(preferredHeight, availableHeight);
  const width = Math.max(rect.width, Math.min(size === 'sm' ? 280 : 320, viewport.width - viewportPadding * 2));
  const left = Math.min(Math.max(viewportPadding, rect.left), viewport.width - viewportPadding - width);
  const top = placement === 'bottom' ? rect.bottom + gap : rect.top - gap - maxHeight;
  return { top, left, width, maxHeight, placement };
}
