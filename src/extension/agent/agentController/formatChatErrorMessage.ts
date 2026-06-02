import { getErrorMessage } from '../../shared/errors';

/**
 * Что это: форматирует ошибку для модального окна webview.
 * Зачем нужно: technical error получает понятный заголовок и контекст команды.
 * Какую продуктовую проблему решает: пользователь и QA видят, какая операция сломалась и почему.
 */
export function formatChatErrorMessage({ error, context }: { error: unknown; context?: string }): string {
  const title = context ? `AIST error (${context})` : 'AIST error';
  return [`**${title}**`, '', getErrorMessage(error)].join('\n');
}
