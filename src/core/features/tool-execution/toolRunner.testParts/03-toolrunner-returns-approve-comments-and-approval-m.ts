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
  it('returns approve comments and approval memory without hiding the model result', async () => {
    const context = createRunnerContext();
    const memoryAdd = vi.fn(async () => undefined);
    const runner = createRunner(context, {
      approvalService: approvalService({
        approved: true,
        continueAfterDeny: false,
        comment: 'Use smaller steps.',
        rememberProject: 'Prefer focused tests for runner changes.'
      }),
      memory: { add: memoryAdd }
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('create_plan', { title: 'Approval', steps: ['Patch runner'] }))
    );

    expect(parseToolResult(context.workingMessages[0]?.content)).toMatchObject({
      ok: true,
      action: 'create_plan',
      userApprovalComment: 'Use smaller steps.'
    });
    expect(getLastToolMessage(context)).toMatchObject({
      approval: 'approved',
      userApprovalComment: 'Use smaller steps.'
    });
    expect(memoryAdd).toHaveBeenCalledWith({
      scope: 'project',
      note: 'Prefer focused tests for runner changes.'
    });
  });
});
