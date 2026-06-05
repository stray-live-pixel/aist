import type { ChatMessage } from '../../../types';

/**
 * Что это: стабильная строковая подпись состава tool-call группы.
 * Зачем нужно: React-effect должен запускаться только когда добавился/исчез tool-call,
 * а не из-за нового массива tools после каждого render истории.
 * Какую продуктовую проблему решает: раскрытые tool-группы не зацикливают обновления state
 * и не разгоняют CPU при нескольких параллельных агентах.
 */
export function getToolCallIdsSignature({ tools }: { tools: ChatMessage[] }): string {
  return tools.map((tool) => tool.id).join('\u0000');
}
