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
  it('returns a structured denial result and skips execution on deny-continue', async () => {
    const context = createRunnerContext();
    const filesystemExecute = vi.fn(async () => ({ ok: true }));
    const runner = createRunner(context, {
      filesystem: { execute: filesystemExecute },
      approvalService: approvalService({
        approved: false,
        continueAfterDeny: true,
        comment: 'Do not run this command.'
      })
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('run_bash_script', { script: 'rm -rf tmp' }))
    );

    expect(filesystemExecute).not.toHaveBeenCalled();
    expect(parseToolResult(context.workingMessages[0]?.content)).toEqual({
      ok: false,
      decision: 'denied',
      comment: 'Do not run this command.',
      continueAfterDeny: true,
      userApprovalComment: 'Do not run this command.'
    });
    expect(getLastToolMessage(context)).toMatchObject({ status: 'denied', approval: 'denied' });
  });
});
