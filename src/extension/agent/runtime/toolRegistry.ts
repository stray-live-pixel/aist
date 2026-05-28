import type { AgentSkill } from '../../../core/skills';
import { DefaultToolRegistry, type ToolRegistrySnapshot } from '../../../core/toolRegistry';
import { getWorkspaceFolder } from '../../shared/workspace';
import { runSkillTool } from '../../skills/skills';
import { filesystemTools } from '../../tools/filesystemTools';
import { planningTools } from '../../tools/planningTools';

export type AgentToolKind = 'builtin' | 'planning' | 'skill' | 'project';
export type AgentToolRegistrySnapshot = ToolRegistrySnapshot;

/**
 * VS Code adapter around the core registry. The extension keeps VS Code-aware
 * filesystem tool definitions, while project discovery and registry semantics
 * live in core for CLI reuse.
 */
export class AgentToolRegistry extends DefaultToolRegistry {
  constructor() {
    super({
      builtinTools: filesystemTools,
      planningToolDefinitions: planningTools,
      skillTool: runSkillTool
    });
  }

  refresh(input: {
    skills: readonly AgentSkill[];
    workspaceRoot?: string;
    disabledProjectToolIds?: readonly string[];
  }): Promise<AgentToolRegistrySnapshot> {
    return super.refresh({
      skills: input.skills,
      workspaceRoot: input.workspaceRoot || getWorkspaceFolder().uri.fsPath,
      disabledProjectToolIds: input.disabledProjectToolIds
    });
  }

  runProjectTool(
    toolName: string,
    args: Record<string, unknown>,
    workspaceRoot?: string
  ): Promise<Record<string, unknown>> {
    return super.runProjectTool(toolName, args, workspaceRoot || getWorkspaceFolder().uri.fsPath);
  }
}

const registry = new AgentToolRegistry();

export function getAgentToolRegistry(): AgentToolRegistry {
  return registry;
}
