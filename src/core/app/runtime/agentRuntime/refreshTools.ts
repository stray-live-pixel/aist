import type { OpenRouterTool } from '../../../shared/types/types';
import type { AgentRuntimeContext } from './context';
import type { AgentRuntimeConfigSnapshot } from './types';
import { withoutRequiredToolCallNotes } from './withoutRequiredToolCallNotes';

/**
 * Что это: обновляет каталог инструментов с учётом skills, workspace и disabled tool ids.
 * Зачем нужно: перед каждым запросом модели tool schema должна отражать актуальное состояние проекта.
 * Какую продуктовую проблему решает: модель не вызывает отключённые или устаревшие инструменты.
 */
export async function refreshTools({
  context,
  config
}: {
  context: AgentRuntimeContext;
  config: AgentRuntimeConfigSnapshot;
}): Promise<OpenRouterTool[]> {
  const [skills, workspaceRoot] = await Promise.all([
    context.deps.skillProvider?.getSkills?.() || [],
    context.deps.workspaceRootProvider?.getWorkspaceRoot?.() || ''
  ]);
  const snapshot = await context.deps.toolRegistry.refresh({
    skills,
    workspaceRoot,
    disabledProjectToolIds: config.disabledProjectToolIds || [],
    auxiliaryModelToolEnabled: config.auxiliaryModelToolEnabled === true
  });
  if (config.toolCallNotesRequired === false) {
    return withoutRequiredToolCallNotes({ tools: snapshot.tools });
  }

  return snapshot.tools;
}
