import type { OpenRouterTool } from '../../openrouter/types';
import { getWorkspaceFolder } from '../../shared/workspace';
import type { AgentSkill } from '../../skills/skills';
import { runSkillTool } from '../../skills/skills';
import { filesystemTools } from '../../tools/filesystemTools';
import { planningTools } from '../../tools/planningTools';
import {
  type ProjectToolDefinition,
  type ProjectToolDiagnostic,
  discoverProjectTools,
  executeProjectTool,
  toOpenRouterProjectTool
} from '../../tools/projectTools';

export type AgentToolKind = 'builtin' | 'skill' | 'project';

export type AgentToolRegistrySnapshot = {
  tools: OpenRouterTool[];
  projectTools: ProjectToolDefinition[];
  diagnostics: ProjectToolDiagnostic[];
  digest: string;
  version: string;
};

const EMPTY_DIGEST = '0'.repeat(64);

/**
 * Single source of truth for model-visible tools. Built-ins are always present,
 * run_skill appears only when skills exist, and project tools are reloaded from
 * `.aist-agent/tools` before model requests.
 */
export class AgentToolRegistry {
  private runnableProjectToolIds = new Set<string>();

  private snapshotValue: AgentToolRegistrySnapshot = {
    tools: [...filesystemTools, ...planningTools],
    projectTools: [],
    diagnostics: [],
    digest: EMPTY_DIGEST,
    version: EMPTY_DIGEST.slice(0, 12)
  };

  async refresh(input: {
    skills: AgentSkill[];
    workspaceRoot?: string;
    disabledProjectToolIds?: readonly string[];
  }): Promise<AgentToolRegistrySnapshot> {
    const workspaceRoot = input.workspaceRoot || getWorkspaceFolder().uri.fsPath;
    const discovery = await discoverProjectTools({
      workspaceRoot,
      disabledToolIds: input.disabledProjectToolIds || []
    });
    const diagnostics = [...discovery.diagnostics];
    const builtInTools = [...filesystemTools, ...planningTools];
    const tools = input.skills.length ? [...builtInTools, runSkillTool] : builtInTools;
    const usedNames = new Set(tools.map((tool) => tool.function.name));
    const projectTools = discovery.tools;
    const runnableProjectToolIds = new Set<string>();

    for (const projectTool of projectTools) {
      if (usedNames.has(projectTool.id)) {
        diagnostics.push({
          code: 'projectTool.idConflict',
          message: `Project tool id conflicts with an existing tool: ${projectTool.id}`,
          path: projectTool.definitionPath,
          toolId: projectTool.id
        });
        continue;
      }
      usedNames.add(projectTool.id);
      if (projectTool.enabled) {
        tools.push(toOpenRouterProjectTool(projectTool));
        runnableProjectToolIds.add(projectTool.id);
      }
    }

    this.runnableProjectToolIds = runnableProjectToolIds;
    this.snapshotValue = {
      tools,
      projectTools,
      diagnostics,
      digest: discovery.digest,
      version: discovery.version
    };
    return this.snapshotValue;
  }

  snapshot(): AgentToolRegistrySnapshot {
    return this.snapshotValue;
  }

  getProjectTool(toolName: string): ProjectToolDefinition | undefined {
    if (!this.runnableProjectToolIds.has(toolName)) {
      return undefined;
    }
    return this.snapshotValue.projectTools.find((tool) => tool.id === toolName && tool.enabled);
  }

  async runProjectTool(
    toolName: string,
    args: Record<string, unknown>,
    workspaceRoot?: string
  ): Promise<Record<string, unknown>> {
    const definition = this.getProjectTool(toolName);
    if (!definition) {
      throw new Error(`Unknown project tool: ${toolName}`);
    }
    return executeProjectTool(definition, args, workspaceRoot || getWorkspaceFolder().uri.fsPath);
  }
}

const registry = new AgentToolRegistry();

export function getAgentToolRegistry(): AgentToolRegistry {
  return registry;
}
