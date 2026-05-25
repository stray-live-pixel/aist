import type { ReactNode } from 'react';

import type { ChatMessage } from '../../../shared/types';

/**
 * Что это: props компонента MessageCard.
 * Зачем нужно: универсальная карточка сообщения для user/assistant/status/error/tool ролей.
 */
export type MessageCardProps = {
  /** Сообщение для отображения. */
  message: ChatMessage;
  /** Опциональные действия (например, кнопка копирования) в заголовке. */
  actions?: ReactNode;
  /** Начальное состояние раскрытости для collapsible-сообщений. */
  defaultExpanded?: boolean;
  /** ID tool-call, который нужно свернуть (пробрасывается в ToolMessageCard). */
  collapseToolId?: string;
};
