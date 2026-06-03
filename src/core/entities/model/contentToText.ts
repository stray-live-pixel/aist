import type { ModelTransportContent } from '../../shared/types/types';

/**
 * Что это: превращает model content в обычный текст.
 * Зачем нужно: часть провайдеров и runtime-сценариев поддерживают только строковые сообщения.
 * Какую продуктовую проблему решает: мультимодальные вложения не теряются в текстовых fallback-сценариях и доходят до модели как data URL.
 */
export function contentToText({ content }: { content?: ModelTransportContent }): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((part) => (part.type === 'text' ? part.text : `Image attachment as data URL (base64):\n${part.image_url.url}`))
    .filter(Boolean)
    .join('\n\n');
}
