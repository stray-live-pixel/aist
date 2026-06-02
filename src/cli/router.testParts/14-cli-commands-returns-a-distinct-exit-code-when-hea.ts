import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { ChatRepository } from '../../core/entities/chat/chatRepository';
import type { ModelClient } from '../../core/entities/model/modelTransport';
import { RunRepository } from '../../core/entities/run/runRepository';
import {
  globalSecretsFile,
  globalSettingsFile,
  globalWorkspaceAutonomousSessionsDir,
  globalWorkspaceChatsDir,
  globalWorkspaceRunsDir,
  workspaceSettingsFile
} from '../../core/entities/storage/storage';
import type { OpenRouterMessage, RuntimeEvent, ToolCall } from '../../core/shared/types/types';
import { CliUsageError, formatHelpOutput, parseCliArgs, resolveCliPaths, runCli } from '../router';
import {
  QueuedModelClient,
  collectCliImports,
  collectResolvedCliImport,
  createCliOutput,
  createIdFactory,
  createNativeAutonomousFlow,
  createQueuedModelClient,
  createTempDir,
  createToolCall,
  formatViolation,
  isDynamicImportOrRequire,
  isPathInsideOrSame,
  listSourceFiles,
  parseJsonl,
  resolveRelativeSourceImport,
  tempDirs
} from './helpers';

describe('CLI commands', () => {
  it('returns a distinct exit code when headless ask mode needs tool approval', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-approval-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      homeDir,
      idFactory: createIdFactory(['chat-approval'])
    }).create({ model: 'fake-model' });
    const modelClient = createQueuedModelClient([
      { role: 'assistant', content: '', tool_calls: [createToolCall('run_bash_script', { script: 'echo no' })] }
    ]);
    let toolExecuted = false;
    const output = createCliOutput();

    const exitCode = await runCli(
      ['chat', 'ask', chat.id, '--prompt', 'Run a command', '--workspace', workspaceRoot, '--jsonl'],
      {
        homeDir,
        modelClient,
        filesystemToolRunner: {
          execute: async () => {
            toolExecuted = true;
            return { ok: true };
          }
        },
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(3);
    expect(toolExecuted).toBe(false);
    expect(output.stderrText()).toContain('approval required for tool run_bash_script');
    const events = parseJsonl<RuntimeEvent>(output.stdoutText());
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['tool.call.approvalRequested']));
    expect(events.at(-1)).toMatchObject({ type: 'run.finished', status: 'stopped' });
  });
});
