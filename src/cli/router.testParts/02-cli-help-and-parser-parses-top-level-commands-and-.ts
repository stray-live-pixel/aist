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

describe('CLI help and parser', () => {
  it('parses top-level commands and workspace options', () => {
    expect(parseCliArgs([])).toEqual({ kind: 'help' });
    expect(parseCliArgs(['--version'])).toEqual({ kind: 'version' });
    expect(parseCliArgs(['paths', '--workspace=repo'])).toEqual({ kind: 'paths', workspace: 'repo' });
    expect(parseCliArgs(['daemon', '--workspace=repo', '--socket', '/tmp/aist-daemon.sock'])).toEqual({
      kind: 'daemon',
      workspace: 'repo',
      socket: '/tmp/aist-daemon.sock'
    });
    expect(parseCliArgs(['doctor', '--workspace', '/tmp/workspace'])).toEqual({
      kind: 'doctor',
      workspace: '/tmp/workspace'
    });
    expect(parseCliArgs(['chat', 'new', '--workspace=repo', '--model', 'codex:gpt-5.1-codex', '--json'])).toEqual({
      kind: 'chatNew',
      workspace: 'repo',
      model: 'codex:gpt-5.1-codex',
      json: true
    });
    expect(parseCliArgs(['chat', 'get', 'chat-1', '--workspace', '/tmp/workspace', '--json'])).toEqual({
      kind: 'chatGet',
      chatId: 'chat-1',
      workspace: '/tmp/workspace',
      json: true
    });
    expect(parseCliArgs(['chat', 'set-model', 'chat-1', 'model-b'])).toEqual({
      kind: 'chatSetModel',
      chatId: 'chat-1',
      model: 'model-b',
      workspace: undefined,
      json: false
    });
    expect(
      parseCliArgs([
        'chat',
        'ask',
        'chat-1',
        '--prompt',
        'Hello',
        '--workspace=repo',
        '--jsonl',
        '--approval-mode',
        'auto-readonly'
      ])
    ).toEqual({
      kind: 'chatAsk',
      chatId: 'chat-1',
      prompt: 'Hello',
      workspace: 'repo',
      stdin: false,
      jsonl: true,
      approvalMode: 'auto-readonly'
    });
    expect(parseCliArgs(['chat', 'ask', 'chat-1', '--stdin', '--jsonl'])).toEqual({
      kind: 'chatAsk',
      chatId: 'chat-1',
      prompt: undefined,
      workspace: undefined,
      stdin: true,
      jsonl: true,
      approvalMode: 'ask'
    });
    expect(parseCliArgs(['config', 'get', 'model', '--workspace=repo', '--json'])).toEqual({
      kind: 'configGet',
      key: 'model',
      workspace: 'repo',
      json: true
    });
    expect(parseCliArgs(['config', 'set', 'model', 'codex:gpt-5.1-codex', '--scope', 'workspace'])).toEqual({
      kind: 'configSet',
      key: 'model',
      value: 'codex:gpt-5.1-codex',
      scope: 'workspace',
      workspace: undefined,
      json: false
    });
    expect(parseCliArgs(['auth', 'openrouter', 'set-key', '--from-env', '--json'])).toEqual({
      kind: 'authOpenRouterSetKey',
      fromEnv: true,
      json: true
    });
    expect(parseCliArgs(['models', 'list', '--provider=codex', '--json'])).toEqual({
      kind: 'modelsList',
      provider: 'codex',
      json: true
    });
    expect(parseCliArgs(['autonomous', 'list', '--workspace=repo', '--json'])).toEqual({
      kind: 'autonomousList',
      workspace: 'repo',
      json: true
    });
    expect(
      parseCliArgs([
        'autonomous',
        'flow',
        'start',
        'demo-flow',
        '--workspace',
        'repo',
        '--jsonl',
        '--engine',
        'openrouter-api',
        '--no-dry-run',
        '--extra-prompt',
        'extra'
      ])
    ).toEqual({
      kind: 'autonomousFlowStart',
      flowId: 'demo-flow',
      workspace: 'repo',
      launch: {
        engineId: 'openrouter-api',
        dryRun: false,
        workDir: undefined,
        extraPrompt: 'extra'
      },
      jsonl: true
    });
    expect(parseCliArgs(['autonomous', 'run', 'start', 'demo-run', '--jsonl'])).toEqual({
      kind: 'autonomousRunStart',
      runId: 'demo-run',
      workspace: undefined,
      launch: {
        engineId: 'dry-run',
        dryRun: true,
        workDir: undefined,
        extraPrompt: undefined
      },
      jsonl: true
    });
    expect(parseCliArgs(['autonomous', 'stop', 'session-1', '--json'])).toEqual({
      kind: 'autonomousStop',
      sessionId: 'session-1',
      workspace: undefined,
      json: true
    });
    expect(parseCliArgs(['autonomous', 'export', 'session-1', '--format=json'])).toEqual({
      kind: 'autonomousExport',
      sessionId: 'session-1',
      workspace: undefined,
      format: 'json'
    });
  });
});
