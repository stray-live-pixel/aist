import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../shared/i18n';

beforeAll(() => {
  vi.stubGlobal('acquireVsCodeApi', () => ({
    postMessage: vi.fn(),
    getState: () => undefined,
    setState: vi.fn()
  }));
});

describe('FloatingChatActions', () => {
  it('keeps Composer header actions in the product order', async () => {
    const { FloatingChatActions } = await import('./ChatPageParts/FloatingChatActions');
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <FloatingChatActions
          extensionVersion="1.2.3"
          activeChatId="chat-1"
          onNewChat={() => undefined}
          onOpenChats={() => undefined}
          onOpenSettings={() => undefined}
          onOpenIsolation={() => undefined}
          vcsToggle={<button title="Show VCS controls: main">main</button>}
        />
      </I18nProvider>
    );

    // Пользовательский порядок верхних кнопок важен для мышечной памяти в Composer.
    const titles = Array.from(html.matchAll(/title="([^"]+)"/g)).map((match) => match[1]);

    expect(titles).toEqual([
      'New chat',
      'Open chats',
      'Open this chat in editor',
      'Open this chat as JSON',
      'Isolated agents',
      'Open agent settings',
      'Show VCS controls: main',
      'v1.2.3'
    ]);
  });
});
