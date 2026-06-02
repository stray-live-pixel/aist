import type { FetchLike } from '../../core/entities/model/modelTransport';

/**
 * Что это: имя переменной окружения с OpenRouter API key.
 * Зачем нужно: daemon проверяет env перед чтением persisted secret.
 * Какую продуктовую проблему решает: пользователь может настроить модель без записи секрета в файл.
 */
export const OPENROUTER_ENV_KEY = 'OPENROUTER_API_KEY';

/**
 * Что это: имя e2e переменной для mock OpenRouter endpoint.
 * Зачем нужно: e2e запускает реальный daemon, но сетевой model API должен быть локальным mock.
 * Какую продуктовую проблему решает: тесты расширения стабильны и не ходят во внешние ИИ-сервисы.
 */
export const E2E_OPENROUTER_ENDPOINT_ENV_KEY = 'AIST_E2E_OPENROUTER_ENDPOINT';

/**
 * Что это: placeholder для скрытых секретов в config/state/logs.
 * Зачем нужно: UI может показать факт наличия секрета без раскрытия значения.
 * Какую продуктовую проблему решает: API keys не утекают через daemon responses.
 */
export const REDACTED_VALUE = '<redacted>';

/**
 * Что это: список daemon tools, которые безопасно выполнять read-only по умолчанию.
 * Зачем нужно: daemon отличает операции чтения от действий, требующих approval.
 * Какую продуктовую проблему решает: агент быстрее читает workspace, но опасные изменения остаются под контролем.
 */
export const READONLY_DAEMON_TOOLS = new Set([
  'get_workspace_info',
  'list_files',
  'read_file',
  'read_file_range',
  'grep_search',
  'set_plan_item_status'
]);

/**
 * Что это: fetch-заглушка для чтения статического каталога моделей.
 * Зачем нужно: fallback model list не должен случайно инициировать сеть.
 * Какую продуктовую проблему решает: config/models UI остаётся быстрым и предсказуемым без API key.
 */
export const unusedFetch: FetchLike = async () => {
  throw new Error('Unexpected network request while listing static model options.');
};
