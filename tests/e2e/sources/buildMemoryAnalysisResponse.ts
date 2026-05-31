import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: mock-ответ ручного анализа чата memory-субагентом.
 * Зачем нужно: e2e проверяет кнопку анализа и inbox памяти на контролируемом кандидате.
 */
export function buildMemoryAnalysisResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: JSON.stringify({
        candidates: [
          {
            kind: 'project_lesson',
            title: 'E2E memory analysis candidate',
            content: 'E2E анализ памяти: после изменения UI нужно проверить скриншотами ключевые состояния.',
            reason: 'В чате пользователь просил проверить визуальную работу memory-субагента.',
            scope: 'project'
          }
        ]
      })
    }
  });
}
