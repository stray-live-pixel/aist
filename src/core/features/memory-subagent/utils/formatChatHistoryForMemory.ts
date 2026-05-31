import type { ChatMessage } from '../../../shared/types/types';

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 900;

/**
 * Что это: готовит короткую историю чата для субагента памяти.
 * Зачем нужно: помощнику нужна суть диалога, но не весь шум инструментов и длинные результаты.
 */
export function formatChatHistoryForMemory(input: { messages: ChatMessage[] }): string {
  const visibleMessages = input.messages
    .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'tool')
    .slice(-MAX_MESSAGES);

  if (!visibleMessages.length) {
    return 'История чата пуста.';
  }

  return visibleMessages.map(formatMessage).join('\n\n');
}

/**
 * Что это: превращает одно сообщение в безопасную строку для анализа памяти.
 * Зачем нужно: субагенту достаточно роли, имени инструмента и короткого содержания без полного JSON-шума.
 */
function formatMessage(message: ChatMessage): string {
  const label = message.role === 'tool' ? `tool:${message.name || 'unknown'}` : message.role;
  const content =
    message.content ||
    message.userApprovalComment ||
    message.reason ||
    (message.status ? `status: ${message.status}` : '');

  return `[${label}] ${truncate({ value: content })}`;
}

/**
 * Что это: ограничивает длину одного сообщения для prompt.
 * Зачем нужно: анализ памяти должен быть дешёвым и устойчивым даже в длинных чатах.
 */
function truncate(input: { value: string }): string {
  const normalized = String(input.value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= MAX_MESSAGE_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_MESSAGE_CHARS - 3).trimEnd()}...`;
}
