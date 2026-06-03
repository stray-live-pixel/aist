/**
 * Что это: нормализует вес полезности заметки в диапазон 1..100.
 * Зачем нужно: модель и старые файлы могут прислать мусорные числа, а память должна иметь стабильный критерий важности.
 * Какую продуктовую проблему решает: сортировка и замены заметок остаются предсказуемыми.
 */
export function normalizeMemoryImportance(input: { value: unknown; fallback: number }): number {
  const raw = typeof input.value === 'number' ? input.value : input.fallback;
  const rounded = Math.round(Number.isFinite(raw) ? raw : input.fallback);
  return Math.max(1, Math.min(100, rounded));
}
