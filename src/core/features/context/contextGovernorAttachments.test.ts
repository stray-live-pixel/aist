import { describe, expect, it } from 'vitest';

import { governModelContext } from './contextGovernor';

/**
 * Что это: regression-тест multimodal user content.
 * Зачем нужно: вложения Composer должны попадать в историю модели в формате OpenRouter image_url + text.
 * Какую продуктовую проблему решает: агент реально получает прикреплённые картинки и файлы, а не только UI-chip в Composer.
 */
describe('governModelContext attachments', () => {
  it('builds multipart user content with image url and text file content', () => {
    const result = governModelContext({
      prompt: 'Analyze attachments',
      history: [],
      attachments: [
        {
          id: 'image-1',
          name: 'screen.png',
          mimeType: 'image/png',
          size: 12,
          kind: 'image',
          dataUrl: 'data:image/png;base64,aW1hZ2U='
        },
        {
          id: 'file-1',
          name: 'notes.txt',
          mimeType: 'text/plain',
          size: 5,
          kind: 'file',
          dataUrl: 'data:text/plain;base64,SW1wb3J0YW50IHRleHQ=',
          text: 'Important text'
        }
      ]
    });

    const userMessage = result.messages[0];
    expect(userMessage.role).toBe('user');
    expect(userMessage.content).toEqual([
      {
        type: 'text',
        text: 'Analyze attachments\n\nAttached files for analysis:\n1. screen.png (image/png)\n2. notes.txt (text/plain)'
      },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,aW1hZ2U=' } },
      {
        type: 'text',
        text: 'Attachment: notes.txt\nMIME: text/plain\nSize: 5 bytes\n\nContent:\nImportant text'
      }
    ]);
  });

  it('passes non-text file content as data url instead of metadata-only fallback', () => {
    const result = governModelContext({
      prompt: 'Analyze binary attachment',
      history: [],
      attachments: [
        {
          id: 'file-1',
          name: 'archive.bin',
          mimeType: 'application/octet-stream',
          size: 4,
          kind: 'file',
          dataUrl: 'data:application/octet-stream;base64,AAEC/w=='
        }
      ]
    });

    const userMessage = result.messages[0];
    expect(userMessage.content).toEqual([
      {
        type: 'text',
        text: 'Analyze binary attachment\n\nAttached files for analysis:\n1. archive.bin (application/octet-stream)'
      },
      {
        type: 'text',
        text: [
          'Attachment: archive.bin',
          'MIME: application/octet-stream',
          'Size: 4 bytes',
          '',
          'Content as data URL (base64):',
          'data:application/octet-stream;base64,AAEC/w=='
        ].join('\n')
      }
    ]);
  });
});
