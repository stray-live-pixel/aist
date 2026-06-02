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
  it('stores OpenRouter auth in the global secret store and never prints the key', async () => {
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(['auth', 'openrouter', 'set-key', '--from-env', '--json'], {
      homeDir,
      env: { OPENROUTER_API_KEY: 'sk-test-secret' },
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(output.stdoutText()).not.toContain('sk-test-secret');
    expect(JSON.parse(output.stdoutText())).toEqual({
      provider: 'openrouter',
      authenticated: true,
      source: 'global-secret'
    });
    expect(JSON.parse(fs.readFileSync(globalSecretsFile(homeDir), 'utf8'))).toEqual({
      openrouter: { apiKey: 'sk-test-secret' }
    });

    const statusOutput = createCliOutput();
    expect(
      await runCli(['auth', 'openrouter', 'status', '--json'], {
        homeDir,
        env: {},
        stdout: statusOutput.stdout,
        stderr: statusOutput.stderr
      })
    ).toBe(0);
    expect(statusOutput.stdoutText()).not.toContain('sk-test-secret');
    expect(JSON.parse(statusOutput.stdoutText())).toEqual({
      provider: 'openrouter',
      authenticated: true,
      source: 'global-secret'
    });
  });
});
