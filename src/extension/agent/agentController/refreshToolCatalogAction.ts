import { getAgentSkills } from '../../skills/skills';
import { getDisabledProjectToolIds } from '../../tools/permissions';
import { refreshDaemonToolCatalog } from '../daemon/toolCatalog';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: обновляет metadata каталога daemon tools.
 * Зачем нужно: daemon должен знать skills и disabled project tools из extension workspace.
 * Какую продуктовую проблему решает: список tool permissions в UI соответствует реальным доступным tools.
 */
export async function refreshToolCatalogAction({ state }: { state: AgentControllerState }): Promise<void> {
  await refreshDaemonToolCatalog({
    skills: getAgentSkills(),
    disabledProjectToolIds: getDisabledProjectToolIds(),
    workspaceRoot: state.daemonRuntime.workspaceRoot
  }).catch((error) => state.logger.error('Failed to refresh daemon tool catalog metadata', error));
}
