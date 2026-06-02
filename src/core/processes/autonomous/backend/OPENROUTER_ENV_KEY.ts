/**
 * Что это: имя переменной окружения с OpenRouter API key.
 * Зачем нужно: backend сначала проверяет runtime env, потом secret-store.
 * Какую продуктовую проблему решает: пользователь может запускать автономные задачи без записи секрета на диск.
 */
export const OPENROUTER_ENV_KEY = 'OPENROUTER_API_KEY';
