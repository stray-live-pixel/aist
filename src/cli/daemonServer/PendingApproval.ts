/**
 * Что это: связь approval id/message id с активным run.
 * Зачем нужно: daemon принимает approve/deny как по approvalId, так и по messageId.
 * Какую продуктовую проблему решает: UI может восстановить pending approval после refresh и всё равно корректно ответить.
 */
export type PendingApproval = {
  readonly approvalId: string;
  readonly messageId: string;
  readonly runId: string;
  readonly chatId: string;
};
