import { buildAfterToolAnswerResponse } from './buildAfterToolAnswerResponse';
import { buildListFilesToolCallResponse } from './buildListFilesToolCallResponse';
import { buildMarkdownAnswerResponse } from './buildMarkdownAnswerResponse';
import { buildSimpleAnswerResponse } from './buildSimpleAnswerResponse';
import { getLastUserText } from './getLastUserText';

/**
 * Что это: выбирает детерминированный ответ mock-модели для e2e flow.
 * Зачем нужно: тесты остаются пользовательскими сценариями, но модель не ходит во внешнюю сеть и не флейкает.
 */
export function buildMockModelResponse({ body }: { body: Record<string, unknown> }): Record<string, unknown> {
  const messages = Array.isArray(body.messages) ? (body.messages as Array<Record<string, unknown>>) : [];
  const lastMessage = messages.at(-1);

  // После результата инструмента модель должна вернуться с финальным ответом.
  if (lastMessage?.role === 'tool') {
    return buildAfterToolAnswerResponse();
  }

  const lastUserText = getLastUserText({ messages });

  // Отдельный flow проверяет видимость reason/nextStep на tool-call list_files.
  if (lastUserText.includes('покажи файлы')) {
    return buildListFilesToolCallResponse();
  }

  // Markdown flow проверяет реальное форматирование ответа в webview.
  if (lastUserText.includes('покажи markdown ответ')) {
    return buildMarkdownAnswerResponse();
  }

  return buildSimpleAnswerResponse();
}
