/**
 * Что это: добавляет user approval comment в tool result.
 * Зачем нужно: комментарий пользователя должен попасть в UI/model-visible result.
 * Какую продуктовую проблему решает: агент учитывает уточнение пользователя после approve.
 */
export function withApprovalComment({
  result,
  comment
}: {
  result: Record<string, unknown>;
  comment: string | undefined;
}): Record<string, unknown> {
  return comment ? { ...result, userApprovalComment: comment } : result;
}
