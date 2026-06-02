import type { ChatMessage, RuntimeChatMessage } from '../../../shared/types/types';
import { toJsonObject } from './toJsonValue';

/**
 * Что это: преобразует message из chat storage в serializable runtime event message.
 * Зачем нужно: tool args/result могут содержать произвольные объекты, а событие должно быть JSON-safe.
 * Какую продуктовую проблему решает: webview и daemon получают одинаковый формат новых сообщений.
 */
export function toRuntimeChatMessage({ message }: { message: ChatMessage }): RuntimeChatMessage {
  return {
    ...message,
    args: message.args ? toJsonObject(message.args) : undefined,
    result: message.result ? toJsonObject(message.result) : undefined,
    modelResult: message.modelResult ? toJsonObject(message.modelResult) : undefined
  };
}
