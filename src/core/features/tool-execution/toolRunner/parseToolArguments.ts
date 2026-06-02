/**
 * Что это: безопасно парсит arguments tool-call в object.
 * Зачем нужно: модель может прислать JSON string, object или некорректное значение.
 * Какую продуктовую проблему решает: tool execution не падает на пустых/битых arguments без необходимости.
 */
export function parseToolArguments({ rawArgs }: { rawArgs: unknown }): Record<string, unknown> {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) return rawArgs as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(rawArgs));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
