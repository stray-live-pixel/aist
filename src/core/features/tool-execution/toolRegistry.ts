import type { OpenRouterTool } from '../../shared/types/types';
import { nodeFilesystemTools } from '../filesystem-tools/filesystemTools';
import { planningTools } from '../planning/planningTools';
import {
  type ProjectToolDefinition,
  type ProjectToolDiagnostic,
  discoverProjectTools,
  executeProjectTool,
  toOpenRouterProjectTool
} from '../project-tools/projectTools';
import { type AgentSkill, runSkillTool } from '../skills/skills';

export type ToolKind = 'builtin' | 'planning' | 'model' | 'skill' | 'project';

export type RegisteredTool = {
  name: string;
  kind: ToolKind;
  definition?: ProjectToolDefinition;
  tool: OpenRouterTool;
};

export type ToolRegistrySnapshot = {
  tools: OpenRouterTool[];
  projectTools: ProjectToolDefinition[];
  diagnostics: ProjectToolDiagnostic[];
  digest: string;
  version: string;
};

export type ToolRegistryRefreshInput = {
  skills: readonly AgentSkill[];
  workspaceRoot: string;
  disabledProjectToolIds?: readonly string[];
  auxiliaryModelToolEnabled?: boolean;
};

export type ToolRegistryImplementationOptions = {
  builtinTools?: readonly OpenRouterTool[];
  planningToolDefinitions?: readonly OpenRouterTool[];
  skillTool?: OpenRouterTool;
  modelTool?: OpenRouterTool;
  discoverProjectTools?: typeof discoverProjectTools;
  executeProjectTool?: typeof executeProjectTool;
};

export interface ToolRegistry {
  refresh(input: ToolRegistryRefreshInput): Promise<ToolRegistrySnapshot>;
  snapshot(): ToolRegistrySnapshot;
  getTool(toolName: string): RegisteredTool | undefined;
  getProjectTool(toolName: string): ProjectToolDefinition | undefined;
  runProjectTool(
    toolName: string,
    args: Record<string, unknown>,
    workspaceRoot: string
  ): Promise<Record<string, unknown>>;
}

const EMPTY_DIGEST = '0'.repeat(64);

const invokeModelTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'invoke_model',
    description:
      'Call the configured auxiliary lightweight AI model for a focused subtask. Use when a short independent answer, classification, extraction, rewrite, or summary is enough.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The focused prompt for the auxiliary model.'
        },
        system: {
          type: 'string',
          description: 'Optional system instruction for the auxiliary model.'
        },
        model: {
          type: 'string',
          description: 'Optional model override. Empty uses the configured auxiliary tool model.'
        },
        reasoningEffort: {
          type: 'string',
          enum: ['auto', 'low', 'medium', 'high'],
          description: 'Optional reasoning effort override for this auxiliary request.'
        },
        reason: {
          type: 'string',
          description: 'Short reason why the auxiliary model is needed now.'
        }
      },
      required: ['prompt']
    }
  }
};

/**
 * Model-visible tool registry shared by CLI and extension adapters.
 *
 * Built-ins and planning tools are deterministic; `run_skill` appears only when
 * skills exist, and project tools are discovered from `.aist-agent/tools`.
 */
export class DefaultToolRegistry implements ToolRegistry {
  private readonly builtinTools: readonly OpenRouterTool[];
  private readonly planningToolDefinitions: readonly OpenRouterTool[];
  private readonly skillTool: OpenRouterTool;
  private readonly modelTool: OpenRouterTool;
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
      tools.push(this.modelTool);
      usedNames.add(this.modelTool.function.name);
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
              : planningNames.has(name)
                ? 'planning'
                : 'builtin',
        definition: projectDefinition,
        tool
      });
    }
  }
}
