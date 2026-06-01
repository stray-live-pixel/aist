import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: переводит surfaces с удалённого чата на следующий чат.
 * Зачем нужно: после delete editor/sidebar не должны ссылаться на отсутствующий chatId.
 * Какую продуктовую проблему решает: пользователь сразу видит доступный диалог вместо пустого экрана.
 */
export function retargetDeletedChat({
  state,
  deletedChatId,
  nextChatId
}: {
  state: AgentControllerState;
  deletedChatId: string;
  nextChatId: string;
}): void {
  if (state.sidebarChatId === deletedChatId) {
    state.sidebarChatId = nextChatId;
  }
  for (const surface of state.editorSurfaces.values()) {
    if (surface.getChatId() === deletedChatId) {
      surface.setChatId(nextChatId);
    }
  }
}
