import { describe, expect, it } from 'vitest';

import { getPreservedBridgeActiveChatId } from './getPreservedBridgeActiveChatId';

/**
 * Что это: regression-тест выбора active chat при full refresh bridge.
 * Зачем нужно: isolated lifecycle не должен незаметно уводить пользователя из текущего стандартного чата.
 * Какую продуктовую проблему решает: Docker live-чат открывается только явной кнопкой «Open standard chat».
 */
describe('getPreservedBridgeActiveChatId', () => {
  it('keeps current active chat even when another isolated chat has an active run', () => {
    expect(
      getPreservedBridgeActiveChatId({
        chats: [{ id: 'local-chat' }, { id: 'isolation-chat' }],
        currentActiveChatId: 'local-chat',
        savedActiveChatId: 'isolation-chat'
      })
    ).toBe('local-chat');
  });

  it('falls back to saved active chat when current chat disappeared', () => {
    expect(
      getPreservedBridgeActiveChatId({
        chats: [{ id: 'saved-chat' }],
        currentActiveChatId: 'deleted-chat',
        savedActiveChatId: 'saved-chat'
      })
    ).toBe('saved-chat');
  });

  it('returns undefined when neither preserved chat exists in daemon snapshot', () => {
    expect(
      getPreservedBridgeActiveChatId({
        chats: [{ id: 'other-chat' }],
        currentActiveChatId: 'deleted-chat',
        savedActiveChatId: 'missing-chat'
      })
    ).toBeUndefined();
  });
});
