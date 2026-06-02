import { getModelRequestErrorInfo } from '../../../entities/model/modelErrors';

/**
 * Что это: определяет штатную отмену model request.
 * Зачем нужно: stop run не должен считаться retryable ошибкой или падением агента.
 * Какую проблему решает: пользовательская остановка отображается как stopped, а не как network failure.
 */
export function isAbortError({ error }: { error: unknown }): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

/**
 * Что это: определяет, можно ли повторить ошибочный запрос к модели.
 * Зачем нужно: временные сетевые ошибки retry, а ошибки auth/config сразу показываются пользователю.
 * Какую проблему решает: агент не тратит попытки на неверный API key и не падает от разовых 5xx/timeout.
 */
export function isRetryableModelRequestError({ error }: { error: unknown }): boolean {
  if (isAbortError({ error })) {
    return false;
  }

  const requestInfo = getModelRequestErrorInfo(error);
  if (requestInfo?.status) {
    if ([400, 401, 403, 404].includes(requestInfo.status)) {
      return false;
    }

    if ([408, 409, 425, 429, 500, 502, 503, 504].includes(requestInfo.status)) {
      return true;
    }
  }

  const message = getErrorMessage({ error }).toLowerCase();
  if (
    message.includes('set openrouteragent.apikey') ||
    message.includes('login chatgpt codex') ||
    message.includes('authorization') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('400 bad request') ||
    message.includes('401 unauthorized') ||
    message.includes('403 forbidden') ||
    message.includes('404 not found')
  ) {
    return false;
  }

  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('terminated') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('stream failed') ||
    message.includes('empty response') ||
    /\b(408|409|425|429|500|502|503|504)\b/.test(message)
  );
}

/**
 * Что это: получает безопасный текст ошибки.
 * Зачем нужно: stop/retry stage не зависит от runtime UI форматтеров.
 * Какую проблему решает: классификация ошибок работает для Error и неизвестных thrown values.
 */
function getErrorMessage({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}
