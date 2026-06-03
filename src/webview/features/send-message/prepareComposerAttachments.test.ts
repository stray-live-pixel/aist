import { describe, expect, it } from 'vitest';

import { prepareComposerAttachments } from './prepareComposerAttachments';

/**
 * Что это: regression-тесты подготовки файлов Composer.
 * Зачем нужно: вложения должны стабильно превращаться в общий payload для IPC и модели.
 * Какую продуктовую проблему решает: изображения уходят как data URL, а небольшие текстовые файлы — как читаемый контент.
 */
describe('prepareComposerAttachments', () => {
  it('reads image files as data urls for vision models', async () => {
    const file = new File(['image-bytes'], 'screen.png', { type: 'image/png' });

    const [attachment] = await prepareComposerAttachments({ files: [file] });

    expect(attachment).toMatchObject({
      name: 'screen.png',
      mimeType: 'image/png',
      size: file.size,
      kind: 'image'
    });
    expect(attachment?.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('reads small text files as text attachments', async () => {
    const file = new File(['hello from fixture'], 'notes.md', { type: 'text/markdown' });

    const [attachment] = await prepareComposerAttachments({ files: [file] });

    expect(attachment).toMatchObject({
      name: 'notes.md',
      mimeType: 'text/markdown',
      kind: 'file',
      text: 'hello from fixture'
    });
  });
});
