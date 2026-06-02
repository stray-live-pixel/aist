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

export const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

export function createTempDir(prefix: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

export function createIdFactory(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] || `generated-${index}`;
}

export function createNativeAutonomousFlow(workspaceRoot: string, flowId: string): void {
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

export type QueuedModelClient = ModelClient & {
  calls: Array<{
    messages: OpenRouterMessage[];
    tools: unknown;
    model: string | undefined;
  }>;
};

export function createQueuedModelClient(responses: Array<OpenRouterMessage | Error>): QueuedModelClient {
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

export function createToolCall(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: 'call-1',
    type: 'function',
    function: {
      name,
      arguments: {
        reason: 'test reason',
        nextStep: 'test next step',
        ...args
      }
    }
  };
}

export function parseJsonl<T>(text: string): T[] {
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function createCliOutput(): {
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

export function listSourceFiles(root: string): string[] {
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

export function collectCliImports(filePath: string): string[] {
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

export function collectResolvedCliImport(
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

export function isDynamicImportOrRequire(node: ts.CallExpression): boolean {
  return (
    node.expression.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(node.expression) && node.expression.text === 'require')
  );
}

export function resolveRelativeSourceImport(filePath: string, moduleSpecifier: string): string | undefined {
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

export function isPathInsideOrSame(rootPath: string, filePath: string): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function formatViolation(filePath: string, node: ts.Node): string {
  const position = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
  return `${path.relative(process.cwd(), filePath)}:${position.line + 1}:${position.character + 1}`;
}
