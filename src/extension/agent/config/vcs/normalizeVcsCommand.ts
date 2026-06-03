/**
 * Что это: нормализация пользовательской команды git-like VCS.
 * Зачем нужно: пользователь может указать git, arc или другую совместимую команду без пробелов по краям.
 * Какую продуктовую проблему решает: VCS-кнопки и backend-команды используют один понятный источник правды.
 */
export function normalizeVcsCommand({ value }: { value: unknown }): string {
  const command = typeof value === 'string' ? value.trim() : '';
  return command || 'git';
}
