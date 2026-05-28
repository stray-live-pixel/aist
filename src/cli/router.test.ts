import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { ChatRepository } from '../core/chatRepository';
import type { ModelClient } from '../core/modelTransport';
import { RunRepository } from '../core/runRepository';
import {
  globalSecretsFile,
  globalSettingsFile,
  workspaceAutonomousSessionsDir,
  workspaceChatsDir,
  workspaceRunsDir,
  workspaceSettingsFile
} from '../core/storage';
import type { OpenRouterMessage, RuntimeEvent, ToolCall } from '../core/types';
import { CliUsageError, formatHelpOutput, parseCliArgs, resolveCliPaths, runCli } from './router';

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('CLI help and parser', () => {
  it('renders stable help output', () => {
    expect(formatHelpOutput()).toMatchInlineSnapshot(`
      "AIST command line interface

      Usage:
        aist --help
        aist --version
        aist paths [--workspace <path>]
        aist doctor [--workspace <path>]
        aist daemon --workspace <path> [--socket <path>]
        aist chat new [--workspace <path>] [--model <model>] [--json]
        aist chat list [--workspace <path>] [--json]
        aist chat get <chatId> [--workspace <path>] [--json]
        aist chat clear <chatId> [--workspace <path>] [--json]
        aist chat set-model <chatId> <model> [--workspace <path>] [--json]
        aist chat ask <chatId> --prompt <text>|--stdin --workspace <path> --jsonl [--approval-mode ask|auto-readonly|auto-all|deny]
        aist config get [key] [--workspace <path>] [--json]
        aist config set <key> <value> --scope global|workspace [--workspace <path>] [--json]
        aist auth openrouter set-key [--from-env] [--json]
        aist auth openrouter status [--json]
        aist auth codex status [--json]
        aist models list [--provider openrouter|codex|all] [--json]
        aist models refresh [--provider openrouter|codex|all] [--json]
        aist autonomous list [--workspace <path>] [--json]
        aist autonomous flow start <flowId> [--workspace <path>] --jsonl [--engine <id>] [--dry-run|--no-dry-run]
        aist autonomous run start <runId> [--workspace <path>] --jsonl [--engine <id>] [--dry-run|--no-dry-run]
        aist autonomous stop <sessionId> [--workspace <path>] [--json]
        aist autonomous export <sessionId> [--workspace <path>] [--format markdown|json]

      Commands:
        paths     Print workspace and global AIST paths.
        doctor    Check workspace and global AIST storage paths.
        daemon    Start the local-socket JSON-RPC backend for one workspace.
        chat      Create, list, inspect and update file-backed chats.
        config    Read or write non-secret CLI/backend settings.
        auth      Manage model provider auth status and global secrets.
        models    List model options from provider adapters or safe fallbacks.
        autonomous
                  Inspect and run native autonomous flows and batch runs.

      Options:
        --workspace <path>  Workspace root. Defaults to the current directory.
        --socket <path>     Override daemon local socket path.
        --model <model>     Model id for chat creation.
        --scope <scope>     Config write scope: global or workspace.
        --provider <name>   Model provider: openrouter, codex, or all.
        --engine <id>       Autonomous engine id: dry-run, openrouter-api, codex-api, claude-cli, or codex-cli.
        --format <format>   Export format: markdown or json.
        --approval-mode <mode>
                            Headless tool policy: ask, auto-readonly, auto-all, or deny.
        --dry-run           Force autonomous dry-run mode (default for autonomous start).
        --no-dry-run        Execute the selected autonomous engine instead of dry-run.
        --from-env          Read OPENROUTER_API_KEY instead of stdin for set-key.
        --json              Print machine-readable JSON.
        --jsonl             Print newline-delimited runtime events.
        --help, -h          Show this help.
        --version, -v       Show the package version.
      "
    `);
  });

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

describe('CLI commands', () => {
  it('prints paths without secret file locations or values', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(['paths', '--workspace', workspaceRoot], {
      cwd: path.dirname(workspaceRoot),
      homeDir,
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(output.stdoutText()).toContain(`Workspace root: ${workspaceRoot}`);
    expect(output.stdoutText()).toContain(`Global AIST root: ${path.join(homeDir, '.aist-agent')}`);
    expect(output.stdoutText()).not.toMatch(/secret/i);
    expect(output.stdoutText()).not.toContain('OPENROUTER_API_KEY');
  });

  it('checks and creates expected storage roots in doctor', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(['doctor', '--workspace', workspaceRoot], {
      homeDir,
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(output.stdoutText()).toContain('OK workspace root: directory exists');
    expect(output.stdoutText()).toContain('OK workspace .aist-agent: accessible');
    expect(output.stdoutText()).toContain('OK global .aist-agent: accessible');
    expect(fs.statSync(path.join(workspaceRoot, '.aist-agent')).isDirectory()).toBe(true);
    expect(fs.statSync(path.join(homeDir, '.aist-agent')).isDirectory()).toBe(true);
  });

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

  it('resolves relative workspaces from the provided current directory', () => {
    const cwd = createTempDir('aist-cli-cwd-');

    expect(resolveCliPaths({ cwd, workspace: 'project', homeDir: cwd }).workspaceRoot).toBe(path.join(cwd, 'project'));
  });

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
    expect(fs.existsSync(workspaceChatsDir(workspaceRoot))).toBe(false);

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
    const chatStorageRoot = path.join(workspaceChatsDir(workspaceRoot), created.chat.id);
    expect(fs.statSync(chatStorageRoot).isDirectory()).toBe(true);
    expect(fs.existsSync(path.join(workspaceChatsDir(workspaceRoot), 'index.json'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'meta.json'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'messages.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(chatStorageRoot, 'history.jsonl'))).toBe(true);

    const repository = new ChatRepository({ workspaceRoot });
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
      fs.readFileSync(path.join(workspaceChatsDir(workspaceRoot), created.chat.id, 'messages.jsonl'), 'utf8')
    ).toBe('');
  });

  it('uses configured model for new chats and returns structured JSON for missing chats', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const setOutput = createCliOutput();

    expect(
      await runCli(
        ['config', 'set', 'model', 'workspace-model', '--scope', 'workspace', '--workspace', workspaceRoot],
        {
          homeDir,
          env: {},
          stdout: setOutput.stdout,
          stderr: setOutput.stderr
        }
      )
    ).toBe(0);

    const newOutput = createCliOutput();
    expect(
      await runCli(['chat', 'new', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        stdout: newOutput.stdout,
        stderr: newOutput.stderr
      })
    ).toBe(0);
    expect(JSON.parse(newOutput.stdoutText())).toMatchObject({
      chat: {
        model: 'workspace-model'
      }
    });

    const missingOutput = createCliOutput();
    const exitCode = await runCli(['chat', 'get', 'missing-chat', '--workspace', workspaceRoot, '--json'], {
      homeDir,
      stdout: missingOutput.stdout,
      stderr: missingOutput.stderr
    });

    expect(exitCode).toBe(1);
    expect(missingOutput.stdoutText()).toBe('');
    expect(JSON.parse(missingOutput.stderrText())).toEqual({
      error: {
        message: 'Chat not found: missing-chat',
        code: 'chat.notFound',
        exitCode: 1,
        details: {
          chatId: 'missing-chat'
        }
      }
    });
  });

  it('runs chat ask from stdin with a fake model, streams JSONL and persists chat and run records', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-ask-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-ask'])
    }).create({ model: 'fake-model' });
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
    expect(JSON.parse(getOutput.stdoutText())).toMatchObject({
      chat: {
        id: chat.id,
        lastAnswer: 'Fake final answer.',
        busy: false,
        messages: [
          { role: 'user', content: 'Prompt from stdin' },
          { role: 'assistant', content: 'Fake final answer.' }
        ]
      }
    });

    const restoredRun = await new RunRepository({ workspaceRoot }).get(started!.run.id);
    expect(restoredRun?.meta).toMatchObject({ chatId: chat.id, status: 'completed' });
    expect(restoredRun?.events.map((event) => event.type)).toEqual(events.map((event) => event.type));
    expect(fs.existsSync(path.join(workspaceRunsDir(workspaceRoot), started!.run.id, 'events.jsonl'))).toBe(true);
  });

  it('runs a fake read-only tool in auto-readonly mode and saves tool history and events', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-tool-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
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
    expect(toolExecutions).toEqual([{ toolName: 'read_file', args: { reason: 'test reason', path: 'fake.txt' } }]);
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
    const restoredRun = await new RunRepository({ workspaceRoot }).get(started!.run.id);
    expect(restoredRun?.toolResults[0]).toMatchObject({
      chatId: chat.id,
      toolCall: { name: 'read_file', args: { path: 'fake.txt' } },
      result: { ok: true, path: 'fake.txt', content: 'fake content' }
    });
    const restoredChat = await new ChatRepository({ workspaceRoot }).get(chat.id);
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

  it('returns a distinct exit code when headless ask mode needs tool approval', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-approval-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-approval'])
    }).create({ model: 'fake-model' });
    const modelClient = createQueuedModelClient([
      { role: 'assistant', content: '', tool_calls: [createToolCall('run_bash_script', { script: 'echo no' })] }
    ]);
    let toolExecuted = false;
    const output = createCliOutput();

    const exitCode = await runCli(
      ['chat', 'ask', chat.id, '--prompt', 'Run a command', '--workspace', workspaceRoot, '--jsonl'],
      {
        homeDir,
        modelClient,
        filesystemToolRunner: {
          execute: async () => {
            toolExecuted = true;
            return { ok: true };
          }
        },
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(3);
    expect(toolExecuted).toBe(false);
    expect(output.stderrText()).toContain('approval required for tool run_bash_script');
    const events = parseJsonl<RuntimeEvent>(output.stdoutText());
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['tool.call.approvalRequested']));
    expect(events.at(-1)).toMatchObject({ type: 'run.finished', status: 'stopped' });
  });

  it('returns an error exit code when a started run fails', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-error-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
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
    expect(await new RunRepository({ workspaceRoot }).get(started!.run.id)).toMatchObject({
      meta: {
        status: 'failed',
        error: { message: 'fake model boom' }
      }
    });
  });

  it('fails before creating a run when OpenRouter auth is missing', async () => {
    const workspaceRoot = createTempDir('aist-cli-chat-auth-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const chat = await new ChatRepository({
      workspaceRoot,
      idFactory: createIdFactory(['chat-auth'])
    }).create({ model: 'openrouter/test-model' });
    const output = createCliOutput();

    const exitCode = await runCli(
      ['chat', 'ask', chat.id, '--prompt', 'Hello', '--workspace', workspaceRoot, '--jsonl'],
      {
        homeDir,
        env: {},
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(1);
    expect(output.stdoutText()).toBe('');
    expect(JSON.parse(output.stderrText())).toMatchObject({
      error: {
        code: 'auth.openrouter.missing',
        exitCode: 1
      }
    });
    expect(fs.existsSync(workspaceRunsDir(workspaceRoot))).toBe(false);
  });

  it('keeps the documented chat ask JSONL fixture parseable', () => {
    const fixturePath = path.join(process.cwd(), 'product', 'cli', 'fixtures', '015-chat-ask-jsonl.jsonl');
    const events = parseJsonl<RuntimeEvent>(fs.readFileSync(fixturePath, 'utf8'));

    expect(events.map((event) => event.type)).toEqual([
      'run.started',
      'message.appended',
      'run.activity',
      'model.request.updated',
      'model.response',
      'message.appended',
      'run.finished'
    ]);
  });

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
        storageRoot: workspaceAutonomousSessionsDir(workspaceRoot),
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
    expect(fs.existsSync(path.join(workspaceAutonomousSessionsDir(workspaceRoot), sessionId, 'events.jsonl'))).toBe(
      true
    );

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

  it('sets and reads config with workspace values taking precedence over global defaults', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    expect(
      await runCli(['config', 'set', 'model', 'global-model', '--scope', 'global', '--json'], {
        homeDir,
        env: {},
        stdout: output.stdout,
        stderr: output.stderr
      })
    ).toBe(0);
    expect(
      await runCli(
        ['config', 'set', 'model', 'workspace-model', '--scope', 'workspace', '--workspace', workspaceRoot],
        {
          homeDir,
          env: {},
          stdout: output.stdout,
          stderr: output.stderr
        }
      )
    ).toBe(0);

    const getOutput = createCliOutput();
    const exitCode = await runCli(['config', 'get', 'model', '--workspace', workspaceRoot, '--json'], {
      homeDir,
      env: {},
      stdout: getOutput.stdout,
      stderr: getOutput.stderr
    });

    expect(exitCode).toBe(0);
    expect(getOutput.stderrText()).toBe('');
    expect(JSON.parse(getOutput.stdoutText())).toEqual({
      key: 'model',
      value: 'workspace-model',
      source: 'workspace',
      redacted: false
    });
    expect(JSON.parse(fs.readFileSync(globalSettingsFile(homeDir), 'utf8'))).toEqual({ model: 'global-model' });
    expect(JSON.parse(fs.readFileSync(workspaceSettingsFile(workspaceRoot), 'utf8'))).toEqual({
      model: 'workspace-model'
    });
  });

  it('rejects secret-like config writes and redacts existing secret-shaped values', async () => {
    const workspaceRoot = createTempDir('aist-cli-workspace-');
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(
      [
        'config',
        'set',
        'openrouter.apiKey',
        'sk-workspace-secret',
        '--scope',
        'workspace',
        '--workspace',
        workspaceRoot
      ],
      {
        homeDir,
        env: {},
        stdout: output.stdout,
        stderr: output.stderr
      }
    );

    expect(exitCode).toBe(2);
    expect(output.stdoutText()).toBe('');
    expect(output.stderrText()).toContain('Refusing to write secret-like config key');
    expect(output.stderrText()).not.toContain('sk-workspace-secret');
    expect(fs.existsSync(workspaceSettingsFile(workspaceRoot))).toBe(false);

    fs.mkdirSync(path.dirname(globalSettingsFile(homeDir)), { recursive: true });
    fs.writeFileSync(
      globalSettingsFile(homeDir),
      JSON.stringify({ model: 'global-model', openrouter: { apiKey: 'sk-global-secret' } }),
      'utf8'
    );

    const getOutput = createCliOutput();
    expect(
      await runCli(['config', 'get', '--workspace', workspaceRoot, '--json'], {
        homeDir,
        env: {},
        stdout: getOutput.stdout,
        stderr: getOutput.stderr
      })
    ).toBe(0);

    expect(getOutput.stdoutText()).toContain('<redacted>');
    expect(getOutput.stdoutText()).not.toContain('sk-global-secret');
    expect(JSON.parse(getOutput.stdoutText())).toEqual({
      values: {
        model: 'global-model',
        openrouter: {
          apiKey: '<redacted>'
        }
      },
      redacted: true
    });
  });

  it('stores OpenRouter auth in the global secret store and never prints the key', async () => {
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(['auth', 'openrouter', 'set-key', '--from-env', '--json'], {
      homeDir,
      env: { OPENROUTER_API_KEY: 'sk-test-secret' },
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(output.stdoutText()).not.toContain('sk-test-secret');
    expect(JSON.parse(output.stdoutText())).toEqual({
      provider: 'openrouter',
      authenticated: true,
      source: 'global-secret'
    });
    expect(JSON.parse(fs.readFileSync(globalSecretsFile(homeDir), 'utf8'))).toEqual({
      openrouter: { apiKey: 'sk-test-secret' }
    });

    const statusOutput = createCliOutput();
    expect(
      await runCli(['auth', 'openrouter', 'status', '--json'], {
        homeDir,
        env: {},
        stdout: statusOutput.stdout,
        stderr: statusOutput.stderr
      })
    ).toBe(0);
    expect(statusOutput.stdoutText()).not.toContain('sk-test-secret');
    expect(JSON.parse(statusOutput.stdoutText())).toEqual({
      provider: 'openrouter',
      authenticated: true,
      source: 'global-secret'
    });
  });

  it('prints Codex auth status as a placeholder without requiring VS Code login code', async () => {
    const homeDir = createTempDir('aist-cli-home-');
    const output = createCliOutput();

    const exitCode = await runCli(['auth', 'codex', 'status', '--json'], {
      homeDir,
      env: {},
      stdout: output.stdout,
      stderr: output.stderr
    });

    expect(exitCode).toBe(0);
    expect(output.stderrText()).toBe('');
    expect(JSON.parse(output.stdoutText())).toEqual({
      provider: 'codex',
      authenticated: false,
      source: 'none',
      login: 'vscode-extension'
    });
  });

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

describe('CLI import boundaries', () => {
  it('keeps webview sources independent from CLI entrypoints', () => {
    const violations = listSourceFiles(path.join(process.cwd(), 'src', 'webview')).flatMap((filePath) =>
      collectCliImports(filePath)
    );

    expect(violations).toEqual([]);
  });
});

function createTempDir(prefix: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

function createIdFactory(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] || `generated-${index}`;
}

function createNativeAutonomousFlow(workspaceRoot: string, flowId: string): void {
  const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', flowId);
  fs.mkdirSync(flowRoot, { recursive: true });
  fs.writeFileSync(
    path.join(flowRoot, '.index.md'),
    ['---', 'title: Demo flow', 'stages:', '  - 1-stage.md', '---', '', '# Demo flow', ''].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(flowRoot, '1-stage.md'),
    ['---', 'title: Stage one', 'contexts: []', '---', '', '# Stage one', '', 'Say hello.', ''].join('\n'),
    'utf8'
  );
}

type QueuedModelClient = ModelClient & {
  calls: Array<{
    messages: OpenRouterMessage[];
    tools: unknown;
    model: string | undefined;
  }>;
};

function createQueuedModelClient(responses: Array<OpenRouterMessage | Error>): QueuedModelClient {
  const queue = [...responses];
  const calls: QueuedModelClient['calls'] = [];
  return {
    calls,
    chat: async (messages, tools, model) => {
      calls.push({ messages, tools, model });
      const next = queue.shift();
      if (next instanceof Error) {
        throw next;
      }
      if (!next) {
        throw new Error('Unexpected fake model request.');
      }
      return next;
    }
  };
}

function createToolCall(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: 'call-1',
    type: 'function',
    function: {
      name,
      arguments: {
        reason: 'test reason',
        ...args
      }
    }
  };
}

function parseJsonl<T>(text: string): T[] {
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function createCliOutput(): {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  stdoutText: () => string;
  stderrText: () => string;
} {
  let stdout = '';
  let stderr = '';

  return {
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    stdoutText: () => stdout,
    stderrText: () => stderr
  };
}

function listSourceFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    if (entry.isFile() && ['.ts', '.tsx'].includes(path.extname(entry.name))) {
      return [entryPath];
    }

    return [];
  });
}

function collectCliImports(filePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const violations: string[] = [];
  const cliRoot = path.join(process.cwd(), 'src', 'cli');

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      collectResolvedCliImport(filePath, node.moduleSpecifier.text, node, cliRoot, violations);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      collectResolvedCliImport(filePath, node.moduleSpecifier.text, node, cliRoot, violations);
    }

    if (ts.isCallExpression(node) && isDynamicImportOrRequire(node)) {
      const [firstArgument] = node.arguments;
      if (firstArgument && ts.isStringLiteral(firstArgument)) {
        collectResolvedCliImport(filePath, firstArgument.text, node, cliRoot, violations);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function collectResolvedCliImport(
  filePath: string,
  moduleSpecifier: string,
  node: ts.Node,
  cliRoot: string,
  violations: string[]
): void {
  const resolvedImport = resolveRelativeSourceImport(filePath, moduleSpecifier);
  if (resolvedImport && isPathInsideOrSame(cliRoot, resolvedImport)) {
    violations.push(formatViolation(filePath, node));
  }
}

function isDynamicImportOrRequire(node: ts.CallExpression): boolean {
  return (
    node.expression.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(node.expression) && node.expression.text === 'require')
  );
}

function resolveRelativeSourceImport(filePath: string, moduleSpecifier: string): string | undefined {
  if (!moduleSpecifier.startsWith('.')) {
    return undefined;
  }

  const basePath = path.resolve(path.dirname(filePath), moduleSpecifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx')
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function isPathInsideOrSame(rootPath: string, filePath: string): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function formatViolation(filePath: string, node: ts.Node): string {
  const position = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
  return `${path.relative(process.cwd(), filePath)}:${position.line + 1}:${position.character + 1}`;
}
