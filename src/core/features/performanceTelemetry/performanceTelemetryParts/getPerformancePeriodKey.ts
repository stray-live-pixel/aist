/**
 * Что это: формирует стабильный ключ календарного периода для performance-графиков.
 * Зачем нужно: UI группирует замеры по дням, неделям и месяцам без повторной логики дат.
 * Какую продуктовую проблему решает: скорость разных версий можно сравнивать в одинаковых временных окнах.
 */
export function getPerformancePeriodKey({
  timestamp,
  period
}: {
  timestamp: number;
  period: 'day' | 'week' | 'month';
}): string {
  const date = new Date(timestamp);
  if (period === 'day') {
    return date.toISOString().slice(0, 10);
  }

  if (period === 'month') {
    return date.toISOString().slice(0, 7);
  }

  return getWeekKey({ date });
}

function getWeekKey({ date }: { date: Date }): string {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
