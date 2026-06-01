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
  it('stops the run on deny-stop after saving the denial into history', async () => {
    const context = createRunnerContext();
    const runner = createRunner(context, {
      approvalService: approvalService({
        approved: false,
        continueAfterDeny: false,
        comment: 'Stop here.'
      })
    });

    await expect(
      runner.handleToolCall(
        createHandleParams(context, createToolCall('create_plan', { title: 'Stop', steps: ['No'] }))
      )
    ).rejects.toThrow(ToolCallDeniedError);

    expect(context.run.stopRequested).toBe(true);
    expect(parseToolResult(context.workingMessages[0]?.content)).toMatchObject({
      ok: false,
      decision: 'denied',
      continueAfterDeny: false
    });
  });
});
