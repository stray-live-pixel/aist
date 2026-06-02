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
  it('rejects secret-like config writes and redacts existing secret-shaped values', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(
      [
        'config',
        'set',
        'openrouter.apiKey',
        'sk-workspace-secret',
        '--scope',
        'workspace',
        '--workspace',
        workspaceRoot
      ],
      {
        homeDir,
        env: {},
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(2);
    expect(output.stdoutText()).toBe('');
    expect(output.stderrText()).toContain('Refusing to write secret-like config key');
    expect(output.stderrText()).not.toContain('sk-workspace-secret');
    expect(fs.existsSync(workspaceSettingsFile(workspaceRoot))).toBe(false);

    fs.mkdirSync(path.dirname(globalSettingsFile(homeDir)), { recursive: true });
    fs.writeFileSync(
      globalSettingsFile(homeDir),
      JSON.stringify({ model: 'global-model', openrouter: { apiKey: 'sk-global-secret' } }),
      'utf8'
    );

    const getOutput = createCliOutput();
    expect(
      await runCli(['config', 'get', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        env: {},
        stdout: getOutput.stdout,
        stderr: getOutput.stderr
      })
    ).toBe(0);

    expect(getOutput.stdoutText()).toContain('<redacted>');
    expect(getOutput.stdoutText()).not.toContain('sk-global-secret');
    expect(JSON.parse(getOutput.stdoutText())).toEqual({
      values: {
        model: 'global-model',
        openrouter: {
          apiKey: '<redacted>'
        }
      },
      redacted: true
    });
  });
});
