import type { MouseEvent } from 'react';

import type { ChatMessage } from '../../../shared/types';

/**
 * Что это: props модалки с сырым JSON tool-call.
 * Зачем нужно: JSON полезен для диагностики, но не должен занимать место в обычной истории чата.
 */
export type ToolRawJsonModalProps = {
  /** Сообщение tool-call для отображения JSON. */
  message: ChatMessage;
  /** Колбэк закрытия модалки — вызывается по клику на backdrop или кнопку X. */
  onClose(event?: MouseEvent): void;
};
