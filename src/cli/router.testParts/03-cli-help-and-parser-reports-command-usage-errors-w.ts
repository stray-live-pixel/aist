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
  it('reports command usage errors without running commands', () => {
    expect(() => parseCliArgs(['doctor', '--workspace'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['daemon'])).toThrow("'daemon' requires --workspace <path>.");
    expect(() => parseCliArgs(['chat', 'ask'])).toThrow("'chat ask' requires a chat id.");
    expect(() => parseCliArgs(['chat', 'ask', 'chat-1', '--prompt', 'Hello'])).toThrow(
      "'chat ask' currently requires --jsonl."
    );
    expect(() =>
      parseCliArgs(['chat', 'ask', 'chat-1', '--prompt', 'Hello', '--jsonl', '--approval-mode', 'maybe'])
    ).toThrow("Option --approval-mode for 'chat ask' must be ask, auto-readonly, auto-all, or deny.");
    expect(() => parseCliArgs(['chat', 'clear'])).toThrow("'chat clear' requires a chat id.");
    expect(() => parseCliArgs(['chat', 'new', '--model'])).toThrow("Option --model for 'chat new' requires a model.");
    expect(() => parseCliArgs(['paths', '--token', 'secret'])).toThrow("Unknown option for 'paths': --token");
    expect(() => parseCliArgs(['config', 'set', 'model', 'gpt'])).toThrow(
      "'config set' requires --scope global|workspace."
    );
    expect(() => parseCliArgs(['models', 'list', '--provider', 'other'])).toThrow(
      "Option --provider for 'models list' must be openrouter, codex, or all."
    );
    expect(() => parseCliArgs(['autonomous', 'flow', 'start', 'demo-flow'])).toThrow(
      "'autonomous flow start' currently requires --jsonl."
    );
    expect(() => parseCliArgs(['autonomous', 'run', 'start', '--jsonl'])).toThrow(
      "'autonomous run start' requires a run id."
    );
    expect(() => parseCliArgs(['autonomous', 'export', 'session-1', '--format=xml'])).toThrow(
      "Option --format for 'autonomous export' must be markdown or json."
    );
  });
});
