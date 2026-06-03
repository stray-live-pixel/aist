/**
 * Что это: форматирует счётчики для telemetry UI.
 * Зачем нужно: большие числа читаются одинаково во всех карточках настроек.
 * Какую продуктовую проблему решает: QA и разработчик быстрее сравнивают показатели без ручного подсчёта разрядов.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
