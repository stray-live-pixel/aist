import type { CodexServiceTier } from '../../../shared/types/types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { getStringSetting } from './getStringSetting';

/**
 * Что это: нормализует service tier для Codex responses transport.
 * Зачем нужно: config может хранить только поддерживаемые значения или мусор.
 * Какую продуктовую проблему решает: Codex-запросы используют безопасный auto-tier по умолчанию.
 */
export async function getCodexServiceTier({
  context
}: {
  context: AutonomousBackendContext;
}): Promise<CodexServiceTier> {
  const value = await getStringSetting({ context, keys: ['openrouterAgent.codexServiceTier', 'codexServiceTier'] });
  return value === 'priority' ? 'priority' : 'auto';
}
