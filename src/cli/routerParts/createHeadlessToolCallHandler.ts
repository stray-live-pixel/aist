import { FileBackedConfigStore } from '../../core/app/config/config';
import { type AgentRuntimeToolCallHandler } from '../../core/app/runtime/agentRuntime';
import { AgentMemoryStore } from '../../core/entities/memory/memory';
import { runNodeSkillTool } from '../../core/features/skills/skills';
import { type ToolRegistry } from '../../core/features/tool-execution/toolRegistry';
import { ToolRunner, type ToolRunnerExecutionAdapter } from '../../core/features/tool-execution/toolRunner';
import { getHeadlessToolPermission } from '../../core/shared/permissions';
import { type ToolApprovalDecision } from '../../core/shared/types/types';
import { CliApprovalMode } from './CliApprovalMode';
import { getHeadlessConfiguredSkills } from './getHeadlessConfiguredSkills';
import { getHeadlessPermissionToolMetadata } from './getHeadlessPermissionToolMetadata';

export function createHeadlessToolCallHandler(input: {
  approvalMode: CliApprovalMode;
  filesystem: ToolRunnerExecutionAdapter;
  memoryStore: AgentMemoryStore;
  toolRegistry: ToolRegistry;
  configStore: FileBackedConfigStore;
  workspaceRoot: string;
}): AgentRuntimeToolCallHandler {
  return async (params) => {
    const runner = new ToolRunner({
      registry: input.toolRegistry,
      context: params.context,
      approvalService: {
        getPermission: (toolName) =>
          getHeadlessToolPermission({
            approvalMode: input.approvalMode,
            toolName,
            tools: getHeadlessPermissionToolMetadata(input.toolRegistry)
          }),
        requestApproval: async (request) => {
          if (input.approvalMode === 'deny') {
            return {
              approved: false,
              continueAfterDeny: true,
              comment: 'Denied by CLI approval policy.'
            } satisfies ToolApprovalDecision;
          }

          return {
            approved: false,
            continueAfterDeny: false,
            comment: 'Tool approval is required in headless ask mode.'
          } satisfies ToolApprovalDecision;
        }
      },
      filesystem: input.filesystem,
      projectTools: {
        execute: (toolName, args) => input.toolRegistry.runProjectTool(toolName, args, input.workspaceRoot)
      },
      skills: {
        execute: async (_toolName, args) =>
          runNodeSkillTool({
            skills: await getHeadlessConfiguredSkills(input.configStore),
            workspaceRoot: input.workspaceRoot,
            args
          })
      },
      memory: {
        add: (candidate) => input.memoryStore.add(candidate)
      },
      events: params.events,
      runRepository: params.runRepository,
      workspaceRoot: input.workspaceRoot,
      getRunId: () => params.runId
    });
    await runner.handleToolCall(params);
  };
}
