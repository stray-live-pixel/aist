import type { Chat, ChatMessage } from '../../shared/types';
import type { ChatTransientState, PendingUserMessage } from './chatTransientState';

/**
 * Строит сообщения для UI с учётом неподтверждённой отправки prompt.
 *
 * Backend остаётся источником истины: как только реальное сообщение пользователя
 * появляется в чате или чат становится busy, локальный pending исчезает.
 */
export function applyChatTransientState({
  chat,
  transient,
  now = Date.now()
}: {
  chat: Chat;
  transient: ChatTransientState;
  now?: number;
}): {
  messages: ChatMessage[];
  busy: boolean;
  activity: Chat['activity'];
  activityDetail: string | undefined;
} {
  const submitting = shouldShowSubmitting({ chat, transient });
  const stopping = transient.stoppingChatId === chat.id && chat.busy;
  const messages = submitting
    ? [...chat.messages, createPendingUserMessage({ chatId: chat.id, prompt: transient.submittingPrompt || '', now })]
    : chat.messages;

  return {
    messages,
    busy: chat.busy || submitting || stopping,
    activity: stopping ? 'stopping' : submitting ? 'thinking' : chat.activity,
    activityDetail: stopping
      ? 'Запрошена остановка агента, ждём подтверждение backend.'
      : submitting
        ? 'Отправляем запрос агенту, сообщение появится после записи backend.'
        : chat.activityDetail
  };
}

/**
 * Убирает локальный submit, когда backend уже подтвердил prompt сообщением или busy-состоянием.
 *
 * Это предотвращает рассинхрон: pending живёт только в коротком промежутке, где
 * пользователь уже нажал send, но source of truth ещё не обновился.
 */
export function clearConfirmedTransientState({
  chat,
  transient
}: {
  chat: Chat;
  transient: ChatTransientState;
}): ChatTransientState {
  const submittingConfirmed =
    transient.submittingChatId === chat.id &&
    (chat.busy || hasUserMessageWithContent({ messages: chat.messages, content: transient.submittingPrompt || '' }));
  const stoppingConfirmed = transient.stoppingChatId === chat.id && !chat.busy;

  if (!submittingConfirmed && !stoppingConfirmed) {
    return transient;
  }

  return {
    submittingChatId: submittingConfirmed ? undefined : transient.submittingChatId,
    submittingPrompt: submittingConfirmed ? undefined : transient.submittingPrompt,
    stoppingChatId: stoppingConfirmed ? undefined : transient.stoppingChatId
  };
}

/**
 * Проверяет, нужно ли ещё показывать локальный pending submit.
 *
 * Если backend уже прислал busy или пользовательское сообщение, UI доверяет
 * backend-снимку и не дублирует локальную карточку.
 */
function shouldShowSubmitting({ chat, transient }: { chat: Chat; transient: ChatTransientState }): boolean {
  if (transient.submittingChatId !== chat.id || !transient.submittingPrompt?.trim()) {
    return false;
  }

  if (chat.busy) {
    return false;
  }

  return !hasUserMessageWithContent({ messages: chat.messages, content: transient.submittingPrompt });
}

/**
 * Создаёт временную карточку prompt в истории.
 *
 * Карточка выглядит как обычное user-сообщение, но marker/id дают понять
 * разработчикам и тестам, что это только UX-индикатор до ответа backend.
 */
function createPendingUserMessage({
  chatId,
  prompt,
  now
}: {
  chatId: string;
  prompt: string;
  now: number;
}): PendingUserMessage {
  return {
    id: `local-pending-user:${chatId}`,
    marker: 'local-pending-user-message',
    role: 'user',
    content: prompt,
    createdAt: now
  };
}

/**
 * Сравнивает prompt с подтверждёнными backend-сообщениями без учёта лишних пробелов.
 *
 * Это нужно, чтобы pending исчезал даже если backend нормализовал переносы или
 * пробелы вокруг prompt при сохранении в файл чата.
 */
function hasUserMessageWithContent({ messages, content }: { messages: ChatMessage[]; content: string }): boolean {
  const normalizedContent = normalizePrompt(content);

  return messages.some(
    (message) => message.role === 'user' && normalizePrompt(message.content || '') === normalizedContent
  );
}

function normalizePrompt(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
