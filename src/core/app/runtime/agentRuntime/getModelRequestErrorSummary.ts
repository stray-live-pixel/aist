import type { getModelRequestErrorInfo } from '../../../entities/model/modelErrors';
import { getErrorMessage } from './getErrorMessage';

/**
 * Что это: выбирает короткое описание ошибки запроса модели для UI и runtime status.
 * Зачем нужно: в modelRequest хранится понятная причина failure без потери HTTP деталей.
 * Какую продуктовую проблему решает: пользователь и QA видят, почему запрос модели не завершился.
 */
export function getModelRequestErrorSummary({
  error,
  info
}: {
  error: unknown;
  info: ReturnType<typeof getModelRequestErrorInfo>;
}): string {
  if (info?.message) {
    return info.message;
  }

  if (info?.status) {
    return `HTTP ${info.status}${info.statusText ? ` ${info.statusText}` : ''}`;
  }

  return getErrorMessage({ error });
}
