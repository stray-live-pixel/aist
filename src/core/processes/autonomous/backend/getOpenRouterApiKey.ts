import { OPENROUTER_API_KEY_SECRET_KEY } from '../../../app/config/config';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';

/**
 * Что это: получает OpenRouter API key из env или secret-store.
 * Зачем нужно: env имеет приоритет для временных CLI/CI запусков, secret-store — для extension login.
 * Какую продуктовую проблему решает: пользователь может запускать автономные задачи без повторной настройки ключа.
 */
export async function getOpenRouterApiKey({
  context
}: {
  context: AutonomousBackendContext;
}): Promise<string | undefined> {
  return context.env[OPENROUTER_ENV_KEY] || context.secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
}
