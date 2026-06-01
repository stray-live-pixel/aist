import type { ReasoningEffort } from '../../../shared/types/types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { getStringSetting } from './getStringSetting';

/**
 * Что это: нормализует reasoning effort для OpenRouter автономного клиента.
 * Зачем нужно: config может хранить legacy/ручное значение.
 * Какую продуктовую проблему решает: запрос к модели не падает из-за неизвестного effort.
 */
export async function getReasoningEffort({ context }: { context: AutonomousBackendContext }): Promise<ReasoningEffort> {
  const value = await getStringSetting({ context, keys: ['openrouterAgent.reasoningEffort', 'reasoningEffort'] });
  return value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh' ? value : 'auto';
}
