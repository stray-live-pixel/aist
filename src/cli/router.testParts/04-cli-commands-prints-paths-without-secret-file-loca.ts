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
  it('prints paths without secret file locations or values', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(['paths', '--workspace', workspaceRoot], {
      cwd: path.dirname(workspaceRoot),
      homeDir,
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(output.stdoutText()).toContain(`Workspace root: ${workspaceRoot}`);
    expect(output.stdoutText()).toContain(`Global AIST root: ${path.join(homeDir, '.aist-agent')}`);
    expect(output.stdoutText()).not.toMatch(/secret/i);
    expect(output.stdoutText()).not.toContain('OPENROUTER_API_KEY');
  });
});
