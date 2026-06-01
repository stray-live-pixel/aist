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
  it('sets and reads config with workspace values taking precedence over global defaults', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    expect(
      await runCli(['config', 'set', 'model', 'global-model', '--scope', 'global', '--json'], {
        homeDir,
        env: {},
        stdout: output.stdout,
        stderr: output.stderr
      })
    ).toBe(0);
    expect(
      await runCli(
        ['config', 'set', 'model', 'workspace-model', '--scope', 'workspace', '--workspace', workspaceRoot],
        {
          homeDir,
          env: {},
          stdout: output.stdout,
          stderr: output.stderr
        }
      )
    ).toBe(0);

    const getOutput = createCliOutput();
    const exitCode = await runCli(['config', 'get', 'model', '--workspace', workspaceRoot, '--json'], {
      homeDir,
      env: {},
      stdout: getOutput.stdout,
      stderr: getOutput.stderr
    });

    expect(exitCode).toBe(0);
    expect(getOutput.stderrText()).toBe('');
    expect(JSON.parse(getOutput.stdoutText())).toEqual({
      key: 'model',
      value: 'workspace-model',
      source: 'workspace',
      redacted: false
    });
    expect(JSON.parse(fs.readFileSync(globalSettingsFile(homeDir), 'utf8'))).toEqual({ model: 'global-model' });
    expect(JSON.parse(fs.readFileSync(workspaceSettingsFile(workspaceRoot), 'utf8'))).toEqual({
      model: 'workspace-model'
    });
  });
});
