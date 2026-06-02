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
  it('prints doctor failures to stderr and returns a non-zero exit code', async () => {
    const tempDir = createTempDir('aist-cli-');
    const missingWorkspaceRoot = path.join(tempDir, 'missing-workspace');
    const output = createCliOutput();

    const exitCode = await runCli(['doctor', '--workspace', missingWorkspaceRoot], {
      homeDir: path.join(tempDir, 'home'),
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(1);
    expect(output.stdoutText()).toContain('FAIL workspace root: missing or inaccessible');
    expect(output.stderrText()).toBe('aist doctor failed: one or more checks failed.\n');
    expect(fs.existsSync(missingWorkspaceRoot)).toBe(false);
  });
});
