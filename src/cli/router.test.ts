import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import { globalSecretsFile, globalSettingsFile, workspaceSettingsFile } from '../core/storage';
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
        config    Read or write non-secret CLI/backend settings.
        auth      Manage model provider auth status and global secrets.
        models    List model options from provider adapters or safe fallbacks.

      Options:
        --workspace <path>  Workspace root. Defaults to the current directory.
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
    expect(() => parseCliArgs(['chat', 'ask'])).toThrow('Unknown command: chat');
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
