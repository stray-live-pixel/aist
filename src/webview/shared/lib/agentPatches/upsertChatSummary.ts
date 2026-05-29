import type { ChatSummary } from '../../types';

/**
 * Что это: заменяет summary чата или добавляет его в список, если чат только появился.
 * Зачем нужно: список чатов должен отражать подтверждённые backend-изменения без пересылки полного AgentState.
 */
export function upsertChatSummary(chats: ChatSummary[], summary: ChatSummary): ChatSummary[] {
  const index = chats.findIndex((chat) => chat.id === summary.id);

  if (index === -1) {
    return [summary, ...chats];
  }

  return chats.map((chat, chatIndex) => (chatIndex === index ? summary : chat));
}
