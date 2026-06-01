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
  it('requires approval for configured skills in auto-readonly mode through shared balanced preset', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-skill-readonly-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      homeDir,
      idFactory: createIdFactory(['chat-skill-readonly'])
    }).create({ model: 'fake-model' });
    fs.mkdirSync(path.join(workspaceRoot, '.aist-agent'), { recursive: true });
    fs.writeFileSync(
      workspaceSettingsFile(workspaceRoot),
      `${JSON.stringify({
        customSkills: [
          {
            id: 'headless-local-skill',
            label: 'Headless local skill',
            description: 'Requires approval in readonly mode.',
            command: 'printf "skill:%s" "$AIST_SKILL_INPUT"',
            permission: 'ask'
          }
        ]
      })}\n`,
      'utf8'
    );
    const modelClient = createQueuedModelClient([
      {
        role: 'assistant',
        content: '',
        tool_calls: [createToolCall('run_skill', { skillId: 'headless-local-skill', input: 'payload' })]
      }
    ]);
    const output = createCliOutput();

    const exitCode = await runCli(
      [
        'chat',
        'ask',
        chat.id,
        '--prompt',
        'Run skill',
        '--workspace',
        workspaceRoot,
        '--jsonl',
        '--approval-mode',
        'auto-readonly'
      ],
      {
        homeDir,
        modelClient,
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(3);
    expect(output.stderrText()).toContain('approval required for tool run_skill');
    const events = parseJsonl<RuntimeEvent>(output.stdoutText());
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['tool.call.approvalRequested']));
  });
});
