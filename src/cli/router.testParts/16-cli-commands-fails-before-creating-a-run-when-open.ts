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
  it('fails before creating a run when OpenRouter auth is missing', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-auth-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      homeDir,
      idFactory: createIdFactory(['chat-auth'])
    }).create({ model: 'openrouter/test-model' });
    const output = createCliOutput();

    const exitCode = await runCli(
      ['chat', 'ask', chat.id, '--prompt', 'Hello', '--workspace', workspaceRoot, '--jsonl'],
      {
        homeDir,
        env: {},
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(output.stdoutText()).toBe('');
    expect(JSON.parse(output.stderrText())).toMatchObject({
      error: {
        code: 'auth.openrouter.missing',
        exitCode: 1
      }
    });
    expect(fs.existsSync(globalWorkspaceRunsDir(workspaceRoot, homeDir))).toBe(false);
  });
});
