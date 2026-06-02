import { getModelRequestErrorInfo } from '../../../entities/model/modelErrors';
import type { RuntimeErrorInfo } from '../../../shared/types/types';

/**
 * Что это: форматирует ошибку агента для chat UI.
 * Зачем нужно: пользователь получает понятный markdown-блок с контекстом сбоя.
 * Какую проблему решает: все runtime ошибки выглядят одинаково в CLI, daemon и webview.
 */
export function formatChatErrorMessage({ error, context }: { error: unknown; context?: string }): string {
  const message = getErrorMessage({ error });
  const title = context ? `AIST error (${context})` : 'AIST error';
  return [`**${title}**`, '', message].join('\n');
}

/**
 * Что это: переводит unknown error в RuntimeErrorInfo.
 * Зачем нужно: run.finished и startAsk reject возвращают структурированную ошибку.
 * Какую проблему решает: UI и CLI не парсят произвольные Error объекты.
 */
export function toRuntimeError({ error }: { error: unknown }): RuntimeErrorInfo {
  return {
    message: getErrorMessage({ error }),
    code: getModelRequestErrorInfo(error)?.status ? String(getModelRequestErrorInfo(error)?.status) : undefined,
    stack: error instanceof Error ? error.stack : undefined
  };
}

/**
 * Что это: получает безопасный текст ошибки.
 * Зачем нужно: финализация run должна работать с любым thrown value.
 * Какую проблему решает: пользователь не видит пустую ошибку при throw строк или plain object.
 */
function getErrorMessage({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}
