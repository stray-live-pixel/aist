import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const coreRoot = path.join(process.cwd(), 'src', 'core');
const sourceExtensions = new Set(['.ts', '.tsx']);

describe('core import boundaries', () => {
  it('keeps src/core independent from the VS Code API', () => {
    const violations = listSourceFiles(coreRoot).flatMap((filePath) => collectVscodeImports(filePath));

    expect(violations).toEqual([]);
  });
});

function listSourceFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      return [entryPath];
    }

    return [];
  });
}

function collectVscodeImports(filePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const violations: string[] = [];

  // Core нельзя связывать с `vscode`, потому что CLI должен переиспользовать этот слой без extension host.
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && isVscodeModuleSpecifier(node.moduleSpecifier)) {
      violations.push(formatViolation(filePath, node));
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && isVscodeModuleSpecifier(node.moduleSpecifier)) {
      violations.push(formatViolation(filePath, node));
    }

    if (ts.isImportEqualsDeclaration(node) && isVscodeImportEqualsDeclaration(node)) {
      violations.push(formatViolation(filePath, node));
    }

    if (ts.isCallExpression(node) && isVscodeCallExpression(node)) {
      violations.push(formatViolation(filePath, node));
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return violations;
}

function isVscodeModuleSpecifier(moduleSpecifier: ts.Expression): boolean {
  return ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'vscode';
}

function isVscodeCallExpression(node: ts.CallExpression): boolean {
  const [firstArgument] = node.arguments;

  if (!firstArgument || !ts.isStringLiteral(firstArgument) || firstArgument.text !== 'vscode') {
    return false;
  }

  return (
    node.expression.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(node.expression) && node.expression.text === 'require')
  );
}

function isVscodeImportEqualsDeclaration(node: ts.ImportEqualsDeclaration): boolean {
  return (
    ts.isExternalModuleReference(node.moduleReference) &&
    node.moduleReference.expression !== undefined &&
    ts.isStringLiteral(node.moduleReference.expression) &&
    node.moduleReference.expression.text === 'vscode'
  );
}

function formatViolation(filePath: string, node: ts.Node): string {
  const position = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
  return `${path.relative(process.cwd(), filePath)}:${position.line + 1}:${position.character + 1}`;
}
