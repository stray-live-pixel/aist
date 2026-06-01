/**
 * Что это: безопасно нормализует timestamp запуска.
 * Зачем нужно: повреждённые или старые файлы могут не содержать корректного числа.
 * Какую проблему решает: репозиторий возвращает рабочий timestamp вместо NaN/undefined.
 */
export function normalizeRunTimestamp({ value }: { value: unknown }): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}
