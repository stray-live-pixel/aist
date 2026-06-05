import type { AgentState, ChatPatchMessage } from '../../types';
import { upsertChatMessage } from './upsertChatMessage';
import { upsertChatSummary } from './upsertChatSummary';

/**
 * Что это: применяет маленькое подтверждённое backend-изменение к последнему snapshot webview.
 * Зачем нужно: UI остаётся read-model от backend-а, но перестаёт ждать полный AgentState для каждого сообщения,
 * статуса или обновления model request.
 */
export function applyAgentPatch(state: AgentState | null, patch: ChatPatchMessage): AgentState | null {
  if (!state) {
    return state;
  }

  const activeChatPatch = patch.chatId === state.activeChat.id ? patch : undefined;
  const activeChat = activeChatPatch
    ? {
        ...state.activeChat,
        ...(patch.chat ? patch.chat : undefined),
        messages: patch.message
          ? upsertChatMessage(state.activeChat.messages, patch.message)
          : state.activeChat.messages
      }
    : state.activeChat;

  return {
    ...state,
    activeChat,
    chats: patch.summary ? upsertChatSummary(state.chats, patch.summary) : state.chats
  };
}
