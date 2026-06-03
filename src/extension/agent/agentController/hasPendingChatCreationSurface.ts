import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: проверяет, открыт ли временный editor нового чата.
 * Зачем нужно: пока daemon создаёт persisted chat, surface ещё привязан к старому fallback chatId.
 * Какую продуктовую проблему решает: автоматический broadcast store не показывает пользователю старый чат вместо создаваемого.
 */
export function hasPendingChatCreationSurface({ state }: { state: AgentControllerState }): boolean {
  return [...state.editorSurfaces.values()].some((surface) => surface.isPendingChatCreation?.() === true);
}
