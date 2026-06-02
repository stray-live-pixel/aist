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
  it('runs a fake read-only tool in auto-readonly mode and saves tool history and events', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-tool-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      homeDir,
      idFactory: createIdFactory(['chat-tool'])
    }).create({ model: 'fake-model' });
    const toolCall = createToolCall('read_file', { path: 'fake.txt' });
    const modelClient = createQueuedModelClient([
      { role: 'assistant', content: '', tool_calls: [toolCall] },
      { role: 'assistant', content: 'The file says fake content.' }
    ]);
    const toolExecutions: Array<{ toolName: string; args: Record<string, unknown> }> = [];
    const output = createCliOutput();

    const exitCode = await runCli(
      [
        'chat',
        'ask',
        chat.id,
        '--prompt',
        'Read fake.txt',
        '--workspace',
        workspaceRoot,
        '--jsonl',
        '--approval-mode',
        'auto-readonly'
      ],
      {
        homeDir,
        modelClient,
        filesystemToolRunner: {
          execute: async (toolName, args) => {
            toolExecutions.push({ toolName, args });
            return { ok: true, path: args.path, content: 'fake content' };
          }
        },
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(toolExecutions).toEqual([
      { toolName: 'read_file', args: { reason: 'test reason', nextStep: 'test next step', path: 'fake.txt' } }
    ]);
    expect(
      modelClient.calls[1]?.messages.some((message) => message.role === 'tool' && message.tool_call_id === 'call-1')
    ).toBe(true);
    const events = parseJsonl<RuntimeEvent>(output.stdoutText());
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['tool.call.started', 'tool.call.completed', 'run.finished'])
    );
    const started = events.find((event): event is Extract<RuntimeEvent, { type: 'run.started' }> => {
      return event.type === 'run.started';
    });
    const restoredRun = await new RunRepository({ workspaceRoot, homeDir }).get(started!.run.id);
    expect(restoredRun?.toolResults[0]).toMatchObject({
      chatId: chat.id,
      toolCall: { name: 'read_file', args: { path: 'fake.txt' } },
      result: { ok: true, path: 'fake.txt', content: 'fake content' }
    });
    const restoredChat = await new ChatRepository({ workspaceRoot, homeDir }).get(chat.id);
    expect(restoredChat?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'tool',
          name: 'read_file',
          status: 'done',
          result: { ok: true, path: 'fake.txt', content: 'fake content' }
        }),
        expect.objectContaining({ role: 'assistant', content: 'The file says fake content.' })
      ])
    );
    expect(restoredChat?.history.at(-2)).toMatchObject({ role: 'tool', tool_call_id: 'call-1' });
  });
});
