import type { ComposerDropDataTransfer } from './dropTypes';

/**
 * Что это: проверяет наличие MIME-типа в DataTransfer.
 * Зачем нужно: браузеры могут возвращать пустые строки для неподдерживаемых типов, поэтому сначала смотрим объявленные types.
 */
export function hasDataTransferType({
  dataTransfer,
  type
}: {
  dataTransfer: ComposerDropDataTransfer;
  type: string;
}): boolean {
  return Array.from(dataTransfer.types ?? []).includes(type);
}
