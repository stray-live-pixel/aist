import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: финальный mock-ответ модели после выполнения list_files.
 * Зачем нужно: e2e проверяет полный agent loop: модель → инструмент → модель → финальный ответ пользователю.
 */
export function buildAfterToolAnswerResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content:
        'Я проверил структуру проекта через list_files. В workspace есть README.md, значит расширение смогло выполнить инструмент и вернуться к финальному ответу без внешней ИИ-модели.'
    }
  });
}
