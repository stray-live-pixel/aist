import { describe, expect, it, vi } from 'vitest';

import type { WebviewSurface } from '../types';
import { postWebviewLoading } from './postWebviewLoading';

/**
 * Что это: regression-тест временного loading-сообщения для новой вкладки чата.
 * Зачем нужно: создание чата теперь открывает editor surface до daemon/FS записи.
 * Какую продуктовую проблему решает: webview получает честный статус вместо показа соседнего активного чата.
 */
describe('postWebviewLoading', () => {
  it('posts loading message to a pending editor surface', () => {
    const postMessage = vi.fn().mockResolvedValue(true);
    const surface = {
      id: 'pending-surface',
      kind: 'editor',
      webview: { postMessage },
      getChatId: () => 'fallback-chat',
      setChatId: vi.fn()
    } as unknown as WebviewSurface;

    postWebviewLoading({ surface, message: 'Чат создаётся...' });

    expect(postMessage).toHaveBeenCalledWith({ type: 'loading', message: 'Чат создаётся...' });
  });
});
