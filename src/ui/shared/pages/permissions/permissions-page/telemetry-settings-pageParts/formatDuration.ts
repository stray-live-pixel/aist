/**
 * Что это: форматирует миллисекунды в короткую человекочитаемую строку.
 * Зачем нужно: performance dashboard показывает скорость без длинных дробных значений.
 * Какую продуктовую проблему решает: регрессии видны сразу по ms/s, а не по сырым числам.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(1)} s`;
}
