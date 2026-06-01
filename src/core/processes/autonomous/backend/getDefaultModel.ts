import { DEFAULT_MODEL } from '../../../entities/model/modelDefaults';
import type { JsonValue } from '../../../shared/types/types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';

/**
 * Что это: получает модель по умолчанию для автономных engine clients.
 * Зачем нужно: запуск без modelOverride должен брать пользовательскую настройку или безопасный default.
 * Какую продуктовую проблему решает: автономные сценарии стартуют предсказуемо даже без явного выбора модели.
 */
export async function getDefaultModel({ context }: { context: AutonomousBackendContext }): Promise<string> {
  const configured = await context.configStore.get<JsonValue>('model', DEFAULT_MODEL);
  return typeof configured === 'string' && configured.trim() ? configured : DEFAULT_MODEL;
}
