import { nodeFilesystemTools } from '../../../core/filesystemTools';
import { planningTools } from '../../../core/planningTools';
import type { AgentSkill } from '../../../core/skills';
import { runSkillTool } from '../../../core/skills';
import { DefaultToolRegistry, type ToolRegistrySnapshot } from '../../../core/toolRegistry';
import type { OpenRouterTool } from '../../../core/types';
import { getWorkspaceFolder } from '../../shared/workspace';

export type DaemonToolCatalogSnapshot = ToolRegistrySnapshot;

const catalog = new DefaultToolRegistry();

export function getDaemonToolCatalog(): DefaultToolRegistry {
  return catalog;
}

export async function refreshDaemonToolCatalog(input: {
  skills: readonly AgentSkill[];
  disabledProjectToolIds?: readonly string[];
  workspaceRoot?: string;
}): Promise<DaemonToolCatalogSnapshot> {
  return catalog.refresh({
    skills: input.skills,
    workspaceRoot: input.workspaceRoot || getWorkspaceFolder().uri.fsPath,
    disabledProjectToolIds: input.disabledProjectToolIds
  });
}

export function getDaemonTools(skills: readonly AgentSkill[]): OpenRouterTool[] {
  const snapshot = catalog.snapshot();
  const tools = snapshot.tools.length ? snapshot.tools : [...nodeFilesystemTools, ...planningTools];
  const hasRunSkill = tools.some((tool) => tool.function.name === runSkillTool.function.name);
  if (!skills.length) {
    return tools.filter((tool) => tool.function.name !== runSkillTool.function.name);
  }
  if (!hasRunSkill) {
    return [...tools, runSkillTool];
  }
  return tools;
}
