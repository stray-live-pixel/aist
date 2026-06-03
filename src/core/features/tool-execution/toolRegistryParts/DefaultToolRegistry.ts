import { type OpenRouterTool } from '../../../shared/types/types';
import { nodeFilesystemTools } from '../../../tools/fs/node_filesystem_tools/nodeFilesystemTools';
import { planningTools } from '../../planning/planningTools';
import {
  type ProjectToolDefinition,
  discoverProjectTools,
  executeProjectTool,
  toOpenRouterProjectTool
} from '../../project-tools/projectTools';
import { runSkillTool } from '../../skills/skills';
import { EMPTY_DIGEST } from './EMPTY_DIGEST';
import { RegisteredTool } from './RegisteredTool';
import { ToolRegistry } from './ToolRegistry';
import { ToolRegistryImplementationOptions } from './ToolRegistryImplementationOptions';
import { ToolRegistryRefreshInput } from './ToolRegistryRefreshInput';
import { ToolRegistrySnapshot } from './ToolRegistrySnapshot';
import { invokeModelTool } from './invokeModelTool';
import { spawnAgentTool } from './spawnAgentTool';

export class DefaultToolRegistry implements ToolRegistry {
  private readonly builtinTools: readonly OpenRouterTool[];
  private readonly planningToolDefinitions: readonly OpenRouterTool[];
  private readonly skillTool: OpenRouterTool;
  private readonly modelTool: OpenRouterTool;
  private readonly agentTool: OpenRouterTool;
  private readonly discoverProjectToolsImpl: typeof discoverProjectTools;
  private readonly executeProjectToolImpl: typeof executeProjectTool;
  private readonly registeredTools = new Map<string, RegisteredTool>();
  private runnableProjectToolIds = new Set<string>();

  private snapshotValue: ToolRegistrySnapshot = {
    tools: [...nodeFilesystemTools, ...planningTools],
    projectTools: [],
    diagnostics: [],
    digest: EMPTY_DIGEST,
    version: EMPTY_DIGEST.slice(0, 12)
  };

  constructor(options: ToolRegistryImplementationOptions = {}) {
    this.builtinTools = options.builtinTools || nodeFilesystemTools;
    this.planningToolDefinitions = options.planningToolDefinitions || planningTools;
    this.skillTool = options.skillTool || runSkillTool;
    this.modelTool = options.modelTool || invokeModelTool;
    this.agentTool = options.agentTool || spawnAgentTool;
    this.discoverProjectToolsImpl = options.discoverProjectTools || discoverProjectTools;
    this.executeProjectToolImpl = options.executeProjectTool || executeProjectTool;
    this.snapshotValue = {
      ...this.snapshotValue,
      tools: [...this.builtinTools, ...this.planningToolDefinitions]
    };
    this.rebuildRegisteredTools(this.snapshotValue.tools, []);
  }

  async refresh(input: ToolRegistryRefreshInput): Promise<ToolRegistrySnapshot> {
    const discovery = await this.discoverProjectToolsImpl({
      workspaceRoot: input.workspaceRoot,
      disabledToolIds: input.disabledProjectToolIds || []
    });
    const diagnostics = [...discovery.diagnostics];
    const tools = [...this.builtinTools, ...this.planningToolDefinitions];
    const usedNames = new Set(tools.map((tool) => tool.function.name));
    const projectTools = discovery.tools;
    const runnableProjectToolIds = new Set<string>();

    if (input.skills.length) {
      tools.push(this.skillTool);
      usedNames.add(this.skillTool.function.name);
    }

    if (input.auxiliaryModelToolEnabled) {
      tools.push(this.modelTool, this.agentTool);
      usedNames.add(this.modelTool.function.name);
      usedNames.add(this.agentTool.function.name);
    }

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
    this.rebuildRegisteredTools(tools, projectTools);
    return this.snapshotValue;
  }

  snapshot(): ToolRegistrySnapshot {
    return this.snapshotValue;
  }

  getTool(toolName: string): RegisteredTool | undefined {
    return this.registeredTools.get(toolName);
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
    workspaceRoot: string
  ): Promise<Record<string, unknown>> {
    const definition = this.getProjectTool(toolName);
    if (!definition) {
      throw new Error(`Unknown project tool: ${toolName}`);
    }

    return this.executeProjectToolImpl(definition, args, workspaceRoot);
  }

  private rebuildRegisteredTools(
    tools: readonly OpenRouterTool[],
    projectTools: readonly ProjectToolDefinition[]
  ): void {
    const projectDefinitions = new Map(projectTools.map((tool) => [tool.id, tool]));
    const planningNames = new Set(this.planningToolDefinitions.map((tool) => tool.function.name));
    const modelToolName = this.modelTool.function.name;
    const agentToolName = this.agentTool.function.name;
    this.registeredTools.clear();

    for (const tool of tools) {
      const name = tool.function.name;
      const projectDefinition = projectDefinitions.get(name);
      this.registeredTools.set(name, {
        name,
        kind: projectDefinition
          ? 'project'
          : name === this.skillTool.function.name
            ? 'skill'
            : name === modelToolName
              ? 'model'
              : name === agentToolName
                ? 'agent'
                : planningNames.has(name)
                  ? 'planning'
                  : 'builtin',
        definition: projectDefinition,
        tool
      });
    }
  }
}
