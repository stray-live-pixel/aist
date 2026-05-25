import type { ChatMessage } from '../../../shared/types';

/**
 * Что это: props компонента ToolMessageCard.
 * Зачем нужно: компактная карточка tool-call с раскрытием деталей.
 */
export type ToolMessageCardProps = {
  /** Сообщение tool-call для отображения. */
  message: ChatMessage;
  /** ID tool-call, который нужно свернуть (используется ToolCallsCut). */
  collapseToolId?: string;
};
