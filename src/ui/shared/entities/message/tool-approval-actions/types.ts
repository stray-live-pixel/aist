/**
 * Что это: props компонента ToolApprovalActions.
 * Зачем нужно: кнопки принятия решения по tool-call используются и в модалке, и внутри карточки.
 */
export type ToolApprovalActionsProps = {
  /** ID сообщения tool-call для отправки решения в extension. */
  messageId: string;
  /** Компактный режим для встраивания в карточку (vs полноэкранный в модалке). */
  compact?: boolean;
  /** Автофокус на кнопке «Approve» — полезно в модалке. */
  autoFocusApprove?: boolean;
  /** Колбэк после отправки решения — обычно закрывает карточку или модалку. */
  onResolved?(): void;
};
