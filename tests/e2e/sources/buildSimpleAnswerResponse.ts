import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: простой mock-ответ модели без tool-call.
 * Зачем нужно: e2e проверяет отправку prompt и отображение ответа, не смешивая этот flow с инструментами.
 */
export function buildSimpleAnswerResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: 'Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.'
    }
  });
}
