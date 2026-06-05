import type { ChatMessage } from '../../../shared/types';
import type { MessageGroup } from './types';

const STICKY_BOTTOM_THRESHOLD_PX = 50;

/**
 * Что это: группирует историю в обычные сообщения и tool-call cut-блоки.
 * Зачем нужно: UI должен показывать инструменты рядом с запросом пользователя, но не раздувать историю после ответа.
 */
export function groupMessages(messages: ChatMessage[], busy: boolean): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentUserMessage: ChatMessage | undefined;
  let pendingTools: ChatMessage[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      flushToolCalls(groups, currentUserMessage, pendingTools, undefined, busy);
      pendingTools = [];
      currentUserMessage = message;
      groups.push({ type: 'single', message });
      continue;
    }

    if (message.role === 'tool') {
      pendingTools.push(message);
      continue;
    }

    if (message.role === 'assistant' && pendingTools.length) {
      flushToolCalls(groups, currentUserMessage, pendingTools, message, false);
      pendingTools = [];
      groups.push({ type: 'single', message });
      currentUserMessage = undefined;
      continue;
    }

    flushToolCalls(groups, currentUserMessage, pendingTools, undefined, busy);
    pendingTools = [];
    groups.push({ type: 'single', message });
  }

  flushToolCalls(groups, currentUserMessage, pendingTools, undefined, busy);
  return groups;
}

/**
 * Что это: id последнего ответа ассистента.
 * Зачем нужно: последний ответ раскрывается по умолчанию, а старые ответы остаются компактнее.
 */
export function getLastAssistantMessageId(messages: ChatMessage[]): string | undefined {
  return [...messages].reverse().find((message) => message.role === 'assistant')?.id;
}

/**
 * Что это: правило раскрытия карточки сообщения по умолчанию.
 * Зачем нужно: пользовательские сообщения компактны, последний ответ виден сразу, служебные сообщения не скрываются.
 */
export function isDefaultExpandedMessage(message: ChatMessage, lastAssistantMessageId?: string): boolean {
  if (message.role === 'assistant') return message.id === lastAssistantMessageId;
  return message.role !== 'user';
}

/**
 * Что это: проверка, находится ли пользователь около нижней границы списка.
 * Зачем нужно: автоскролл не должен уводить пользователя вниз, если он читает старые сообщения.
 */
export function isNearBottom(element: HTMLElement | null): boolean {
  if (!element) {
    return true;
  }

  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceToBottom < STICKY_BOTTOM_THRESHOLD_PX;
}

/**
 * Что это: принудительный скролл к концу истории.
 * Зачем нужно: новые сообщения и streaming должны оставаться в видимой области, пока пользователь сам не ушёл выше.
 */
export function scrollToBottom(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  element.scrollTop = element.scrollHeight;
}

function flushToolCalls(
  groups: MessageGroup[],
  userMessage: ChatMessage | undefined,
  tools: ChatMessage[],
  assistantMessage: ChatMessage | undefined,
  active: boolean
) {
  if (!tools.length) {
    return;
  }

  groups.push({
    type: 'toolCalls',
    id: `tool-calls-${tools[0].id}`,
    userMessage,
    assistantMessage,
    tools: [...tools],
    active
  });
}
