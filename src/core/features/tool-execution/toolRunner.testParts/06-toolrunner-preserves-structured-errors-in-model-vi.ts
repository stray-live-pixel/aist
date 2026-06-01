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
  it('preserves structured errors in model-visible results', async () => {
    const context = createRunnerContext();
    const runner = createRunner(context, {
      filesystem: {
        execute: vi.fn(async () => {
          throw createToolError('TIMEOUT', 'Tool execution timed out.', { timeoutMs: 1000 });
        })
      },
      approvalService: autoApprovalService()
    });

    await runner.handleToolCall(createHandleParams(context, createToolCall('run_bash_script', { script: 'sleep 10' })));

    expect(parseToolResult(context.workingMessages[0]?.content)).toEqual({
      ok: false,
      code: 'TIMEOUT',
      error: 'Tool execution timed out.',
      details: { timeoutMs: 1000 }
    });
    expect(getLastToolMessage(context)).toMatchObject({
      status: 'error',
      result: {
        ok: false,
        code: 'TIMEOUT',
        error: 'Tool execution timed out.'
      }
    });
  });
});
