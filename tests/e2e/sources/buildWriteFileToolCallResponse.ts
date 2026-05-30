import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: mock-ответ модели, который просит daemon вызвать write_file.
 * Зачем нужно: e2e проверяет, что fast-edit запускает безопасное редактирование автоматически без approval-модалки.
 */
export function buildWriteFileToolCallResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_e2e_write_file',
          type: 'function',
          function: {
            name: 'write_file',
            arguments: JSON.stringify({
              reason: 'Нужно создать тестовый файл, чтобы проверить автоматическое редактирование в fast-edit.',
              nextStep: 'После записи файла я подтвержу пользователю, что fast-edit не запрашивал лишнее разрешение.',
              path: 'e2e-permissions-fast-edit.txt',
              content: 'fast-edit wrote this file automatically\n'
            })
          }
        }
      ]
    }
  });
}
