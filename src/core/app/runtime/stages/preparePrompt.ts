import type { OpenRouterMessage } from '../../../shared/types/types';

/**
 * Что это: готовит рабочую историю для model loop с системным prompt наверху.
 * Зачем нужно: модель всегда получает актуальные системные инструкции и историю без старых system-сообщений.
 * Какую проблему решает: подготовка prompt находится отдельно от loop и не дублирует источник правды истории.
 */
export function createWorkingMessages({
  systemPrompt,
  initialHistory
}: {
  systemPrompt: string;
  initialHistory: OpenRouterMessage[];
}): OpenRouterMessage[] {
  return [{ role: 'system', content: systemPrompt }, ...initialHistory.filter((message) => message.role !== 'system')];
}

/**
 * Что это: удаляет system-сообщения перед сохранением истории чата.
 * Зачем нужно: системный prompt пересобирается на каждый run и не должен копиться в persisted history.
 * Какую проблему решает: история остаётся консистентной и не хранит устаревшие системные инструкции.
 */
export function getPersistableHistory({ messages }: { messages: OpenRouterMessage[] }): OpenRouterMessage[] {
  return messages.filter((message) => message.role !== 'system');
}
