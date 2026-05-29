import type { ChatMessage } from '../../types';

/**
 * Что это: заменяет существующее сообщение или добавляет новое в конец истории.
 * Зачем нужно: backend может прислать как новое сообщение, так и подтверждённое обновление tool-card;
 * UI применяет только подтверждённые данные и не создаёт локальную альтернативную правду.
 */
export function upsertChatMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = messages.findIndex((item) => item.id === message.id);

  if (index === -1) {
    return [...messages, message];
  }

  return messages.map((item, itemIndex) => (itemIndex === index ? message : item));
}
