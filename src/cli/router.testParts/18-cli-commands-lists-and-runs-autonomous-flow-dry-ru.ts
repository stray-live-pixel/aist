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
  it('lists and runs autonomous flow dry-run through shared backend storage', async () => {
    const workspaceRoot = createTempDir('aist-cli-autonomous-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    createNativeAutonomousFlow(workspaceRoot, 'demo-flow');

    const listOutput = createCliOutput();
    expect(
      await runCli(['autonomous', 'list', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: listOutput.stdout,
        stderr: listOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(listOutput.stdoutText())).toMatchObject({
      workspaceRoot,
      state: {
        storageRoot: globalWorkspaceAutonomousSessionsDir(workspaceRoot, homeDir),
        definitions: {
          flows: [
            {
              id: 'demo-flow',
              stages: [{ title: 'Stage one' }]
            }
          ]
        },
        sessions: []
      }
    });

    const startOutput = createCliOutput();
    const exitCode = await runCli(
      ['autonomous', 'flow', 'start', 'demo-flow', '--workspace', workspaceRoot, '--jsonl'],
      {
        homeDir,
        stdout: startOutput.stdout,
        stderr: startOutput.stderr
      }
    );

    expect(exitCode).toBe(0);
    expect(startOutput.stderrText()).toBe('');
    const events = parseJsonl<Record<string, unknown>>(startOutput.stdoutText());
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'autonomous.session.started',
        'autonomous.event',
        'autonomous.session.finished',
        'autonomous.completed'
      ])
    );
    expect(events.some((event) => (event as { event?: { action?: string } }).event?.action === 'DRY')).toBe(true);
    const completed = events.find((event) => event.type === 'autonomous.completed');
    expect(completed).toMatchObject({ status: 'finished', kind: 'flow', targetId: 'demo-flow' });
    const sessionId = completed?.sessionId as string;
    expect(
      fs.existsSync(path.join(globalWorkspaceAutonomousSessionsDir(workspaceRoot, homeDir), sessionId, 'events.jsonl'))
    ).toBe(true);

    const exportOutput = createCliOutput();
    expect(
      await runCli(['autonomous', 'export', sessionId, '--workspace', workspaceRoot, '--format', 'json'], {
        homeDir,
        stdout: exportOutput.stdout,
        stderr: exportOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(exportOutput.stdoutText())).toMatchObject({
      meta: {
        id: sessionId,
        status: 'finished'
      }
    });
  });
});
