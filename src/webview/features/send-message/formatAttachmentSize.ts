/**
 * Что это: форматирует размер вложения в компактную подпись.
 * Зачем нужно: пользователю важно быстро понять вес файла перед отправкой модели.
 * Какую продуктовую проблему решает: Composer показывает понятные KB/MB вместо сырых байтов.
 */
export function formatAttachmentSize({ bytes }: { bytes: number }): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
