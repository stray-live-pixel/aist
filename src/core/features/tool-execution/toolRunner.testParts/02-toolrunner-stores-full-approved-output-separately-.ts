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
  it('stores full approved output separately from compact model-visible output', async () => {
    const context = createRunnerContext();
    const stdout = 'large stdout '.repeat(3000);
    const toolResults: unknown[] = [];
    const runner = createRunner(context, {
      filesystem: {
        execute: vi.fn(async () => ({
          ok: true,
          cwd: '.',
          exitCode: 0,
          signal: null,
          timedOut: false,
          durationMs: 12,
          stdout,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false
        }))
      },
      approvalService: autoApprovalService(),
      runRepository: {
        appendToolResult: async (_runId, result) => {
          toolResults.push(result);
        }
      }
    });

    await runner.handleToolCall(
      createHandleParams(
        context,
        createToolCall('run_bash_script', { reason: 'verify compaction', script: 'printf big' })
      )
    );

    const toolMessage = getLastToolMessage(context);
    const modelResult = parseToolResult(context.workingMessages[0]?.content) as Record<string, unknown>;

    expect(String((toolMessage.result as Record<string, unknown>).stdout)).toContain('large stdout');
    expect(toolMessage.modelResult).toMatchObject({
      ok: true,
      modelResultNotice: {
        compacted: true,
        fullResultStoredIn: 'ChatMessage.result'
      }
    });
    expect(modelResult).toEqual(toolMessage.modelResult);
    expect(modelResult).not.toHaveProperty('stdout');
    expect(toolResults).toHaveLength(1);
    expect(JSON.stringify(toolResults[0])).toContain('large stdout');
  });
});
