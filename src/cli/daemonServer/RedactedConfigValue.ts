import type { JsonValue } from '../../core/shared/types/types';

/**
 * Что это: результат чтения настройки с признаком маскирования секрета.
 * Зачем нужно: config.get возвращает структуру без раскрытия API keys/tokens.
 * Какую продуктовую проблему решает: пользователь видит, что секрет задан, но значение не утекает в UI/logs.
 */
export type RedactedConfigValue = {
  readonly value: JsonValue | undefined;
  readonly redacted: boolean;
};
