import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createToolError } from '../../../shared/lib/toolErrors';
import type {
  AgentRun,
  Chat,
  ChatMessage,
  OpenRouterMessage,
  ToolApprovalDecision,
  ToolCall
} from '../../../shared/types/types';
import { PROJECT_TOOLS_RELATIVE_DIR } from '../../project-tools/projectTools';
import { DefaultToolRegistry } from '../toolRegistry';
import { ToolCallDeniedError, ToolRunner, type ToolRunnerDeps, type ToolRunnerMutableContext } from '../toolRunner';
import {
  RunnerContext,
  approvalService,
  autoApprovalService,
  createChat,
  createHandleParams,
  createModelSettings,
  createRunner,
  createRunnerContext,
  createToolCall,
  createWorkspace,
  getLastToolMessage,
  parseToolResult,
  tempRoots,
  writeProjectTool
} from './helpers';

describe('ToolRunner', () => {
  it('executes planning, filesystem, project and skill tools through adapters', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'project_echo');
    const registry = new DefaultToolRegistry();
    await registry.refresh({
      workspaceRoot,
      skills: [{ id: 'demo', label: 'Demo', description: '', command: 'echo demo', permission: 'auto' }]
    });
    const context = createRunnerContext();
    const filesystemExecute = vi.fn(async () => ({ ok: true, stdout: 'fs\n' }));
    const projectExecute = vi.fn(async () => ({ ok: true, output: { project: true } }));
    const skillExecute = vi.fn(async () => ({ ok: true, stdout: 'skill\n' }));
    const runner = createRunner(context, {
      registry,
      filesystem: { execute: filesystemExecute },
      projectTools: { execute: projectExecute },
      skills: { execute: skillExecute },
      approvalService: autoApprovalService()
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('create_plan', { title: 'Plan', steps: ['One'] }))
    );
    await runner.handleToolCall(createHandleParams(context, createToolCall('run_bash_script', { script: 'echo fs' })));
    await runner.handleToolCall(createHandleParams(context, createToolCall('project_echo', { message: 'project' })));
    await runner.handleToolCall(createHandleParams(context, createToolCall('run_skill', { skillId: 'demo' })));

    expect(context.chat.activePlan).toMatchObject({ title: 'Plan', items: [{ text: 'One', status: 'in_progress' }] });
    expect(filesystemExecute).toHaveBeenCalledWith('run_bash_script', expect.objectContaining({ script: 'echo fs' }));
    expect(projectExecute).toHaveBeenCalledWith('project_echo', expect.objectContaining({ message: 'project' }));
    expect(skillExecute).toHaveBeenCalledWith('run_skill', expect.objectContaining({ skillId: 'demo' }));
    expect(context.workingMessages).toHaveLength(4);
  });
});
