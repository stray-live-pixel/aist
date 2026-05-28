import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

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

      Commands:
        paths    Print workspace and global AIST paths.
        doctor   Check workspace and global AIST storage paths.

      Options:
        --workspace <path>  Workspace root. Defaults to the current directory.
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
  });

  it('reports command usage errors without running commands', () => {
    expect(() => parseCliArgs(['doctor', '--workspace'])).toThrow(CliUsageError);
    expect(() => parseCliArgs(['chat', 'ask'])).toThrow('Unknown command: chat');
    expect(() => parseCliArgs(['paths', '--token', 'secret'])).toThrow("Unknown option for 'paths': --token");
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
