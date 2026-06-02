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
  it('runs chat ask from stdin with a fake model, streams JSONL and persists chat and run records', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-ask-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      homeDir,
      idFactory: createIdFactory(['chat-ask'])
    }).create({ model: 'fake-model' });
    fs.mkdirSync(path.join(workspaceRoot, '.aist-agent'), { recursive: true });
    fs.writeFileSync(
      workspaceSettingsFile(workspaceRoot),
      `${JSON.stringify({
        customSkills: [
          {
            id: 'lazy-local-skill',
            label: 'Lazy local skill',
            description: 'Loaded lazily from workspace settings.',
            command: 'echo skill',
            permission: 'ask'
          }
        ]
      })}\n`,
      'utf8'
    );
    const modelClient = createQueuedModelClient([
      {
        role: 'assistant',
        content: 'Fake final answer.',
        usage: { promptTokens: 4, completionTokens: 5, totalTokens: 9 }
      }
    ]);
    const output = createCliOutput();

    const exitCode = await runCli(['chat', 'ask', chat.id, '--stdin', '--workspace', workspaceRoot, '--jsonl'], {
      homeDir,
      stdin: Readable.from(['Prompt from stdin']),
      modelClient,
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    const systemMessage = modelClient.calls[0]?.messages.find((message) => message.role === 'system');
    expect(systemMessage?.content).toContain('## Skills');
    expect(systemMessage?.content).toContain(
      '- lazy-local-skill: Lazy local skill - Loaded lazily from workspace settings.'
    );
    const events = parseJsonl<RuntimeEvent>(output.stdoutText());
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        'run.started',
        'run.activity',
        'model.request.updated',
        'model.response',
        'message.appended',
        'run.finished'
      ])
    );
    const started = events.find((event): event is Extract<RuntimeEvent, { type: 'run.started' }> => {
      return event.type === 'run.started';
    });
    expect(started?.run).toMatchObject({ chatId: chat.id, prompt: 'Prompt from stdin', model: 'fake-model' });

    const getOutput = createCliOutput();
    expect(
      await runCli(['chat', 'get', chat.id, '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: getOutput.stdout,
        stderr: getOutput.stderr
      })
    ).toBe(0);
    const restoredChat = JSON.parse(getOutput.stdoutText()).chat;
    expect(restoredChat).toMatchObject({
      id: chat.id,
      lastAnswer: 'Fake final answer.',
      busy: false
    });
    expect(restoredChat.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Prompt from stdin' }),
        expect.objectContaining({ role: 'tool', name: 'get_relevant_memory', status: 'done' }),
        expect.objectContaining({ role: 'assistant', content: 'Fake final answer.' })
      ])
    );

    const restoredRun = await new RunRepository({ workspaceRoot, homeDir }).get(started!.run.id);
    expect(restoredRun?.meta).toMatchObject({ chatId: chat.id, status: 'completed' });
    expect(restoredRun?.events.map((event) => event.type)).toEqual(events.map((event) => event.type));
    expect(
      fs.existsSync(path.join(globalWorkspaceRunsDir(workspaceRoot, homeDir), started!.run.id, 'events.jsonl'))
    ).toBe(true);
  });
});
