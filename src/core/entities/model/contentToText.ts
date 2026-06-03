import type { ModelTransportContent } from '../../shared/types/types';

/**
 * Что это: превращает model content в обычный текст.
 * Зачем нужно: часть провайдеров и runtime-сценариев поддерживают только строковые сообщения.
 * Какую продуктовую проблему решает: мультимодальные вложения не ломают Codex fallback и сохранение текстового ответа.
 */
export function contentToText({ content }: { content?: ModelTransportContent }): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((part) => (part.type === 'text' ? part.text : '[image attachment]'))
    .filter(Boolean)
    .join('\n\n');
}
