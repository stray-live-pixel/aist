import type { JsonValue } from '../../../shared/types/types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';

/**
 * Что это: читает первую строковую настройку из набора ключей.
 * Зачем нужно: новые и legacy config keys должны работать одинаково.
 * Какую продуктовую проблему решает: пользовательские настройки модели сохраняют совместимость после переименований.
 */
export async function getStringSetting({
  context,
  keys
}: {
  context: AutonomousBackendContext;
  keys: readonly string[];
}): Promise<string | undefined> {
  for (const key of keys) {
    const value = await context.configStore.get<JsonValue>(key);
    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
}
