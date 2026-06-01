import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: mock-ответ memory-субагента, который выбирает первую доступную e2e заметку из prompt.
 * Зачем нужно: id заметки создаётся продуктовым кодом из текста пользователя, поэтому e2e mock должен выбирать реальный id.
 */
export function buildMemorySelectionResponse({ body }: { body: Record<string, unknown> }): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: JSON.stringify({
        selectedIds: [getFirstMemoryId({ body })].filter(Boolean),
        reason: 'E2E выбрал заметку памяти, потому она явно относится к текущему запросу.'
      })
    }
  });
}

/**
 * Что это: достает id первой заметки из prompt memory-субагента.
 * Зачем нужно: тест остаётся устойчивым к продуктовому алгоритму генерации id памяти.
 */
function getFirstMemoryId({ body }: { body: Record<string, unknown> }): string {
  const serializedMessages = JSON.stringify(body.messages || []);
  return serializedMessages.match(/id=([^;\n]+)/)?.[1] || '';
}
