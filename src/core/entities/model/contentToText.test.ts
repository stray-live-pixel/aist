import { describe, expect, it } from 'vitest';

import { contentToText } from './contentToText';

/**
 * Что это: regression-тест текстового fallback для multipart content.
 * Зачем нужно: Codex-like провайдеры получают строковый input и не должны терять содержимое изображений.
 * Какую продуктовую проблему решает: прикреплённый скриншот доходит до модели даже там, где нет native image_url payload.
 */
describe('contentToText', () => {
  it('keeps image data url in text fallback instead of a metadata-only placeholder', () => {
    const text = contentToText({
      content: [
        { type: 'text', text: 'Analyze image' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,aW1hZ2U=' } }
      ]
    });

    expect(text).toBe('Analyze image\n\nImage attachment as data URL (base64):\ndata:image/png;base64,aW1hZ2U=');
  });
});
