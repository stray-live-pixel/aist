import type { AgentAttachment, ChatMessage } from '../../shared/types';

/**
 * Локальное состояние пользовательского действия, которое ещё не подтверждено backend.
 *
 * Source of truth остаётся в файлах чата на стороне backend, а это состояние
 * только закрывает UX-разрыв между кликом пользователя и первым подтверждённым
 * событием от агента.
 */
export type ChatTransientState = {
  /** Идентификатор чата, где пользователь уже отправил prompt, но backend ещё не прислал сообщение или busy. */
  submittingChatId?: string;
  /** Текст prompt, который нужно временно показать в истории как pending user message. */
  submittingPrompt?: string;
  /** Вложения prompt, которые нужно временно показать вместе с pending user message. */
  submittingAttachments?: AgentAttachment[];
  /** Когда пользователь нажал stop, UI сразу показывает остановку до подтверждения backend. */
  stoppingChatId?: string;
};

/**
 * Временное сообщение пользователя для мгновенной реакции истории чата.
 *
 * Оно намеренно имеет стабильный marker, чтобы его было просто отличить от
 * подтверждённых backend-сообщений и не считать источником истины.
 */
export type PendingUserMessage = ChatMessage & {
  marker: 'local-pending-user-message';
};
