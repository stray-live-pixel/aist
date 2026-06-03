/**
 * Что это: форматирует числа для компактных dashboard-плиток.
 * Зачем нужно: лимиты контекста и счётчики легче читать с разделителями тысяч.
 * Какую продуктовую проблему решает: пользователь быстрее считывает масштаб настройки без технического шума.
 */
export function formatCompactNumber({ value }: { value: number | undefined }): string {
  if (value === undefined || Number.isNaN(value)) return '—';

  return new Intl.NumberFormat('ru-RU').format(value);
}
