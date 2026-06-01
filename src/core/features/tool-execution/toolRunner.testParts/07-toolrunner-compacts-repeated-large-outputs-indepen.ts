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
  it('compacts repeated large outputs independently', async () => {
    const context = createRunnerContext();
    const stdout = 'repeat-output '.repeat(3000);
    const runner = createRunner(context, {
      filesystem: {
        execute: vi.fn(async () => ({
          ok: true,
          cwd: '.',
          exitCode: 0,
          signal: null,
          timedOut: false,
          durationMs: 1,
          stdout,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false
        }))
      },
      approvalService: autoApprovalService()
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('run_bash_script', { script: 'first' }, 'call-1'))
    );
    await runner.handleToolCall(
      createHandleParams(context, createToolCall('run_bash_script', { script: 'second' }, 'call-2'))
    );

    expect(context.workingMessages).toHaveLength(2);
    expect(context.chat.messages.filter((message) => message.role === 'tool')).toHaveLength(2);
    for (const message of context.workingMessages) {
      const result = parseToolResult(message.content);
      expect(result).toMatchObject({ ok: true, stdoutChars: stdout.length });
      expect(result).not.toHaveProperty('stdout');
    }
  });
});
