import type { OpenRouterMessage } from '../../../../../core/shared/types/types';

/**
 * Что это: достаёт plain text из ответа model transport.
 * Зачем нужно: разные провайдеры могут вернуть строку или массив content parts.
 * Какую продуктовую проблему решает: генерация git metadata не зависит от конкретного формата ответа OpenRouter/Codex.
 */
export function extractModelText({ message }: { message: OpenRouterMessage }): string {
  const content = message.content;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  }

  return '';
}
