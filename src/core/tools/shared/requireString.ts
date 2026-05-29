import { createToolError } from '../../shared/lib/toolErrors';

/**
 * Проверяет обязательный строковый аргумент инструмента.
 *
 * Для продукта это единая точка контроля входных данных: если модель передала
 * не строку, пользователь получает одинаковую структурированную ошибку во всех
 * инструментах, а не разные сообщения из разных частей кода.
 */
export function requireString({ value, name }: { value: unknown; name: string }): string {
  if (typeof value !== 'string') {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a string.`, { argument: name });
  }

  return value;
}
