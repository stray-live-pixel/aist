import { describe, expect, it } from 'vitest';

import { prepareComposerAttachments } from './prepareComposerAttachments';

/**
 * Что это: regression-тесты подготовки файлов Composer.
 * Зачем нужно: вложения должны стабильно превращаться в общий payload для IPC и модели.
 * Какую продуктовую проблему решает: изображения, текстовые и бинарные файлы уходят с реальным содержимым, а не только с именем.
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

  it('keeps image data url for large screenshots instead of sending only metadata', async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large-screen.png', { type: 'image/png' });

    const [attachment] = await prepareComposerAttachments({ files: [file] });

    expect(attachment).toMatchObject({
      name: 'large-screen.png',
      mimeType: 'image/png',
      size: file.size,
      kind: 'image'
    });
    expect(attachment?.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('reads small text files as text attachments and preserves original data url', async () => {
    const file = new File(['hello from fixture'], 'notes.md', { type: 'text/markdown' });

    const [attachment] = await prepareComposerAttachments({ files: [file] });

    expect(attachment).toMatchObject({
      name: 'notes.md',
      mimeType: 'text/markdown',
      kind: 'file',
      text: 'hello from fixture'
    });
    expect(attachment?.dataUrl).toMatch(/^data:text\/markdown;base64,/);
  });

  it('reads binary files as data urls so the model receives file content', async () => {
    const file = new File([new Uint8Array([0, 1, 2, 255])], 'archive.bin', { type: 'application/octet-stream' });

    const [attachment] = await prepareComposerAttachments({ files: [file] });

    expect(attachment).toMatchObject({
      name: 'archive.bin',
      mimeType: 'application/octet-stream',
      kind: 'file'
    });
    expect(attachment?.dataUrl).toBe('data:application/octet-stream;base64,AAEC/w==');
    expect(attachment?.text).toBeUndefined();
  });
});
