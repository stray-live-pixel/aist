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
  it('returns an error exit code when a started run fails', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-error-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      homeDir,
      idFactory: createIdFactory(['chat-error'])
    }).create({ model: 'fake-model' });
    const output = createCliOutput();

    const exitCode = await runCli(
      ['chat', 'ask', chat.id, '--prompt', 'Fail please', '--workspace', workspaceRoot, '--jsonl'],
      {
        homeDir,
        modelClient: createQueuedModelClient([new Error('fake model boom')]),
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(output.stderrText()).toContain('run failed: fake model boom');
    const events = parseJsonl<RuntimeEvent>(output.stdoutText());
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['run.error']));
    const started = events.find((event): event is Extract<RuntimeEvent, { type: 'run.started' }> => {
      return event.type === 'run.started';
    });
    expect(await new RunRepository({ workspaceRoot, homeDir }).get(started!.run.id)).toMatchObject({
      meta: {
        status: 'failed',
        error: { message: 'fake model boom' }
      }
    });
  });
});
