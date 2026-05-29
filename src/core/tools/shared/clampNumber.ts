/**
 * Приводит числовой аргумент инструмента к безопасному диапазону.
 *
 * Так агент не сможет случайно запросить слишком большой объём данных: невалидное
 * значение заменяется дефолтом, а валидное аккуратно ограничивается минимумом и
 * максимумом конкретного инструмента.
 */
export function clampNumber({
  value,
  fallback,
  min,
  max
}: {
  value: unknown;
  fallback: number;
  min: number;
  max: number;
}): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numeric)));
}
