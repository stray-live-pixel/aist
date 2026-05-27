import { getModelRequestErrorInfo } from '../../openrouter/errors';
import { getErrorMessage } from '../../shared/errors';
import { isAbortError } from './runtime';

/** Количество попыток держим небольшим: transient network ошибки частые, но долгие циклы ухудшают UX и могут дублировать tool context. */
export const MAX_MODEL_REQUEST_ATTEMPTS = 3;

/**
 * Форматирует ошибку в markdown-сообщение чата.
 *
 * Контекст добавляется в заголовок, чтобы пользователь видел, какой этап упал:
 * первичный agent run, retry модели или отдельная команда webview.
 */
export function formatChatErrorMessage(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  const title = context ? `AIST error (${context})` : 'AIST error';
  return [`**${title}**`, '', message].join('\n');
}

/**
 * Определяет, стоит ли повторять запрос к LLM после ошибки транспорта.
 *
 * Сначала отсекаем пользовательскую отмену и детерминированные ошибки доступа/4xx:
 * retry их не исправит и только создаст лишние сообщения. Затем ищем признаки
 * временных сетевых сбоев у fetch/undici, OpenRouter SSE и ChatGPT Codex backend.
 */
export function isRetryableModelRequestError(error: unknown): boolean {
  if (isAbortError(error)) {
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

  const message = getErrorMessage(error).toLowerCase();
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
