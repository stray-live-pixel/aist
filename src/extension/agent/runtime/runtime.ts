import type { OpenRouterMessage } from '../../openrouter/types';

export function isAbortError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

/**
 * Убирает system prompt перед сохранением истории чата.
 *
 * System prompt строится динамически из языка, режима и skills. Если хранить его
 * в истории, смена настроек не применится к следующим запросам пользователя.
 */
export function getPersistableHistory(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  return messages.filter((message) => message.role !== 'system');
}
