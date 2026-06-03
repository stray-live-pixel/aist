import type { ToolMessageCardProps } from './types';

/**
 * Что это: правило повторного рендера tool-card.
 * Зачем нужно: результат инструмента может содержать большой JSON/output,
 * поэтому карточка пересчитывает display model только при реальном изменении tool-сообщения.
 * Какую продуктовую проблему решает: длинные цепочки инструментов остаются отзывчивыми при параллельной работе агентов.
 */
export function areToolMessageCardPropsEqual(previous: ToolMessageCardProps, next: ToolMessageCardProps): boolean {
  return previous.message === next.message && previous.collapseToolId === next.collapseToolId;
}
