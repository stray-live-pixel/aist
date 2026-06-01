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
  it('creates, lists, reads, clears and changes file-backed chats from the CLI', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-workspace-');
    const homeDir = createTempDir('aist-cli-home-');

    const emptyListOutput = createCliOutput();
    expect(
      await runCli(['chat', 'list', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: emptyListOutput.stdout,
        stderr: emptyListOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(emptyListOutput.stdoutText())).toEqual({
      workspaceRoot,
      chats: []
    });
    expect(fs.existsSync(globalWorkspaceChatsDir(workspaceRoot, homeDir))).toBe(false);

    const newOutput = createCliOutput();
    expect(
      await runCli(['chat', 'new', '--workspace', workspaceRoot, '--model', 'model-a', '--json'], {
        homeDir,
        stdout: newOutput.stdout,
        stderr: newOutput.stderr
      })
    ).toBe(0);
    expect(newOutput.stderrText()).toBe('');
    const created = JSON.parse(newOutput.stdoutText()) as {
      workspaceRoot: string;
      chat: { id: string; model: string; title: string; messages: unknown[] };
    };
    expect(created).toMatchObject({
      workspaceRoot,
      chat: {
        model: 'model-a',
        title: 'New chat',
        messages: []
      }
    });
    const chatStorageDir = globalWorkspaceChatsDir(workspaceRoot, homeDir);
    const chatStorageRoot = path.join(chatStorageDir, created.chat.id);
    expect(fs.statSync(chatStorageRoot).isDirectory()).toBe(true);
    expect(fs.existsSync(path.join(chatStorageDir, 'index.json'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'meta.json'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'messages.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'history.jsonl'))).toBe(true);

    const repository = new ChatRepository({ workspaceRoot, homeDir });
    await repository.appendMessage(created.chat.id, { role: 'user', content: 'Hello from CLI' });
    await repository.appendMessage(created.chat.id, { role: 'assistant', content: 'Stored answer' });

    const listOutput = createCliOutput();
    expect(
      await runCli(['chat', 'list', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: listOutput.stdout,
        stderr: listOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(listOutput.stdoutText())).toMatchObject({
      workspaceRoot,
      chats: [
        {
          id: created.chat.id,
          title: 'Hello from CLI',
          model: 'model-a',
          messageCount: 2,
          lastUserMessage: 'Hello from CLI'
        }
      ]
    });

    const getOutput = createCliOutput();
    expect(
      await runCli(['chat', 'get', created.chat.id, '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: getOutput.stdout,
        stderr: getOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(getOutput.stdoutText())).toMatchObject({
      workspaceRoot,
      chat: {
        id: created.chat.id,
        model: 'model-a',
        messages: [
          { role: 'user', content: 'Hello from CLI' },
          { role: 'assistant', content: 'Stored answer' }
        ]
      }
    });

    const modelOutput = createCliOutput();
    expect(
      await runCli(['chat', 'set-model', created.chat.id, 'model-b', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: modelOutput.stdout,
        stderr: modelOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(modelOutput.stdoutText())).toMatchObject({
      chat: {
        id: created.chat.id,
        model: 'model-b'
      }
    });

    const clearOutput = createCliOutput();
    expect(
      await runCli(['chat', 'clear', created.chat.id, '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: clearOutput.stdout,
        stderr: clearOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(clearOutput.stdoutText())).toMatchObject({
      cleared: true,
      chat: {
        id: created.chat.id,
        model: 'model-b',
        title: 'New chat',
        messages: [],
        history: [],
        lastAnswer: ''
      }
    });
    expect(
      fs.readFileSync(
        path.join(globalWorkspaceChatsDir(workspaceRoot, homeDir), created.chat.id, 'messages.jsonl'),
        'utf8'
      )
    ).toBe('');
  });
});
