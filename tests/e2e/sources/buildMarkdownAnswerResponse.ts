import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: mock-ответ модели с markdown-разметкой.
 * Зачем нужно: e2e проверяет, что реальный webview показывает структурированный ответ агента: заголовок, список и code block.
 * Какую продуктовую проблему решает: пользователь должен читать полезный ответ, а не сырой markdown-текст.
 */
export function buildMarkdownAnswerResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: [
        '## План проверки AIST',
        '',
        '- Проверить composer в реальном VS Code',
        '- Убедиться, что модель замокана локально',
        '',
        '```bash',
        'npm run test:e2e',
        '```'
      ].join('\n')
    }
  });
}
