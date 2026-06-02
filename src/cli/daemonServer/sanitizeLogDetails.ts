import { REDACTED_VALUE } from './constants';
import { isSecretLikeConfigPath } from './isSecretLikeConfigPath';

/**
 * Что это: безопасно нормализует details для daemon log.
 * Зачем нужно: Error, arrays и nested objects должны логироваться полезно, но без секретов.
 * Какую продуктовую проблему решает: QA получает диагностируемые логи, а пользовательские tokens не утекают.
 */
export function sanitizeLogDetails({ value }: { value: unknown }): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogDetails({ value: item }));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = isSecretLikeConfigPath({ key }) ? REDACTED_VALUE : sanitizeLogDetails({ value: item });
    }
    return result;
  }

  return value;
}
