import { getErrorMessage } from '../../shared/errors';
import { isAbortError } from './runtime';

export const MAX_MODEL_REQUEST_ATTEMPTS = 3;

export function formatChatErrorMessage(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  const title = context ? `AIST error (${context})` : 'AIST error';
  return [`**${title}**`, '', message].join('\n');
}

export function isRetryableModelRequestError(error: unknown): boolean {
  if (isAbortError(error)) {
    return false;
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
