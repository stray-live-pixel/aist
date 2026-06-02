/**
 * Что это: достаёт reason из аргументов tool-call.
 * Зачем нужно: approval и activity должны объяснять пользователю цель действия.
 * Какую продуктовую проблему решает: tool-call не выглядит как непрозрачное техническое действие.
 */
export function getToolReason({ args }: { args: Record<string, unknown> }): string {
  const reason = args.reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : 'No reason provided by the model.';
}
