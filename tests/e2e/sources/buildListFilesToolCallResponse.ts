import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: mock-ответ модели, который просит daemon вызвать list_files.
 * Зачем нужно: e2e проверяет продуктовый контракт tool-call: пользователь видит reason и nextStep до результата инструмента.
 */
export function buildListFilesToolCallResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_e2e_list_files',
          type: 'function',
          function: {
            name: 'list_files',
            arguments: JSON.stringify({
              reason:
                'Нужно увидеть файлы проекта так же, как это сделал бы пользователь при первичной проверке workspace.',
              nextStep: 'После списка файлов я кратко объясню пользователю, что нашёл в проекте.',
              path: '.',
              maxDepth: 1,
              limit: 20
            })
          }
        }
      ]
    }
  });
}
