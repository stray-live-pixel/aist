import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { ChatRepository } from '../core/chatRepository';
import { globalSecretsFile, globalSettingsFile, workspaceChatsDir, workspaceSettingsFile } from '../core/storage';
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
        aist chat new [--workspace <path>] [--model <model>] [--json]
        aist chat list [--workspace <path>] [--json]
        aist chat get <chatId> [--workspace <path>] [--json]
        aist chat clear <chatId> [--workspace <path>] [--json]
        aist chat set-model <chatId> <model> [--workspace <path>] [--json]
        aist config get [key] [--workspace <path>] [--json]
        aist config set <key> <value> --scope global|workspace [--workspace <path>] [--json]
        aist auth openrouter set-key [--from-env] [--json]
        aist auth openrouter status [--json]
        aist auth codex status [--json]
        aist models list [--provider openrouter|codex|all] [--json]
        aist models refresh [--provider openrouter|codex|all] [--json]

      Commands:
        paths     Print workspace and global AIST paths.
        doctor    Check workspace and global AIST storage paths.
        chat      Create, list, inspect and update file-backed chats.
        config    Read or write non-secret CLI/backend settings.
        auth      Manage model provider auth status and global secrets.
        models    List model options from provider adapters or safe fallbacks.

      Options:
        --workspace <path>  Workspace root. Defaults to the current directory.
        --model <model>     Model id for chat creation.
        --scope <scope>     Config write scope: global or workspace.
        --provider <name>   Model provider: openrouter, codex, or all.
        --from-env          Read OPENROUTER_API_KEY instead of stdin for set-key.
        --json              Print machine-readable JSON.
        --help, -h          Show this help.
        --version, -v       Show the package version.
      "
    `);
  });

  it('parses top-level commands and workspace options', () => {
    expect(parseCliArgs([])).toEqual({ kind: 'help' });
    expect(parseCliArgs(['--version'])).toEqual({ kind: 'version' });
    expect(parseCliArgs(['paths', '--workspace=repo'])).toEqual({ kind: 'paths', workspace: 'repo' });
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
  });

  it('reports command usage errors without running commands', () => {
    expect(() => parseCliArgs(['doctor', '--workspace'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['chat', 'ask'])).toThrow('Unknown chat command: ask');
    expect(() => parseCliArgs(['chat', 'clear'])).toThrow("'chat clear' requires a chat id.");
    expect(() => parseCliArgs(['chat', 'new', '--model'])).toThrow("Option --model for 'chat new' requires a model.");
    expect(() => parseCliArgs(['paths', '--token', 'secret'])).toThrow("Unknown option for 'paths': --token");
    expect(() => parseCliArgs(['config', 'set', 'model', 'gpt'])).toThrow(
      "'config set' requires --scope global|workspace."
    );
    expect(() => parseCliArgs(['models', 'list', '--provider', 'other'])).toThrow(
      "Option --provider for 'models list' must be openrouter, codex, or all."
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
