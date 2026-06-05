import type { AgentModeId } from '../../shared/types';

/**
 * Что это: список встроенных режимов, которые нельзя удалить из UI.
 * Зачем нужно: проверка дублируется при каждом рендере пункта, поэтому держим инвариант рядом с компонентом и не смешиваем его с разметкой.
 */
const DEFAULT_MODE_IDS = new Set<AgentModeId>(['default', 'careful']);

/**
 * Что это: проверка возможности удаления режима агента.
 * Зачем нужно: пользовательские режимы удаляются через подтверждение, а встроенные режимы должны оставаться доступными всегда.
 */
export function canDeleteAgentMode(modeId: AgentModeId): boolean {
  return !DEFAULT_MODE_IDS.has(modeId);
}
