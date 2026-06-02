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
  it('lists fallback models without auth and uses the OpenRouter adapter when a key is available', async () => {
    const homeDir = createTempDir('aist-cli-home-');
    const fallbackOutput = createCliOutput();

    expect(
      await runCli(['models', 'list', '--provider', 'all', '--json'], {
        homeDir,
        env: {},
        stdout: fallbackOutput.stdout,
        stderr: fallbackOutput.stderr
      })
    ).toBe(0);
    const fallback = JSON.parse(fallbackOutput.stdoutText()) as {
      fallbackUsed: boolean;
      models: Array<{ provider: string; id: string }>;
    };
    expect(fallback.fallbackUsed).toBe(true);
    expect(fallback.models.some((model) => model.provider === 'openrouter')).toBe(true);
    expect(fallback.models.some((model) => model.provider === 'codex')).toBe(true);

    const adapterOutput = createCliOutput();
    const seenHeaders: Record<string, string> = {};
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      Object.assign(seenHeaders, init?.headers);
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'openrouter/test-model',
              name: 'Test Model',
              context_length: 1234,
              supported_parameters: ['tools']
            }
          ]
        }),
        { status: 200 }
      );
    };

    expect(
      await runCli(['models', 'list', '--provider', 'openrouter', '--json'], {
        homeDir,
        env: { OPENROUTER_API_KEY: 'sk-test-secret' },
        fetch,
        stdout: adapterOutput.stdout,
        stderr: adapterOutput.stderr
      })
    ).toBe(0);
    expect(seenHeaders).toMatchObject({ Authorization: 'Bearer sk-test-secret' });
    expect(adapterOutput.stdoutText()).not.toContain('sk-test-secret');
    expect(JSON.parse(adapterOutput.stdoutText())).toMatchObject({
      provider: 'openrouter',
      fallbackUsed: false,
      models: [
        {
          id: 'openrouter/test-model',
          name: 'Test Model',
          provider: 'openrouter',
          contextLength: 1234,
          supportsTools: true
        }
      ]
    });
  });
});
