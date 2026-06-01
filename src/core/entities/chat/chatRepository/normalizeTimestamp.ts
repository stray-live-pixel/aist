/**
 * Что это: нормализация timestamp из persisted-файла.
 * Зачем нужно: повреждённое или старое значение не должно ломать открытие чата.
 * Какую продуктовую проблему решает: пользователь сохраняет доступ к истории даже при частично некорректных метаданных.
 */
export function normalizeTimestamp({ value }: { value: unknown }): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}
