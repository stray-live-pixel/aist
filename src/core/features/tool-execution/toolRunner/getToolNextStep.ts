/**
 * Что это: достаёт nextStep из аргументов tool-call.
 * Зачем нужно: approval UI показывает, что агент планирует сделать после tool.
 * Какую продуктовую проблему решает: пользователь лучше понимает контекст опасного действия.
 */
export function getToolNextStep({ args }: { args: Record<string, unknown> }): string | undefined {
  const nextStep = args.nextStep;
  return typeof nextStep === 'string' && nextStep.trim() ? nextStep.trim() : undefined;
}
