import type { AgentRuntimeContext } from '../context';

/**
 * Что это: проверяет, можно ли запускать новый run для чата.
 * Зачем нужно: runtime поддерживает режим конкуренции по чату или по workspace.
 * Какую продуктовую проблему решает: пользователь не получает две конкурирующие генерации в одном scope.
 */
export function hasActiveRun({ context, chatId }: { context: AgentRuntimeContext; chatId: string }): boolean {
  return context.deps.concurrencyScope === 'chat'
    ? context.activeRunsByChat.has(chatId)
    : context.activeRunsById.size > 0;
}
