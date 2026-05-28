import { Buffer } from 'node:buffer';

import { createToolError } from '../../../shared/lib/toolErrors';
import { applyUnifiedPatchToContents } from './applyPatch';

export const SMALL_FILE_REWRITE_MAX_BYTES = 64 * 1024;

export type SemanticEditRequestedStrategy = 'auto' | 'exact_replace' | 'patch' | 'rewrite';
export type SemanticEditStrategyUsed = 'exact_replace' | 'patch' | 'rewrite_small_file' | 'rewrite_full_file';

export type SemanticEditDiagnostic = {
  level: 'info' | 'warning';
  message: string;
};

export type SemanticEditChangedRange = {
  path: string;
  changedStartLine: number;
  changedStartColumn: number;
  changedEndLine: number;
  changedEndColumn: number;
};

export type SemanticEditPlan = {
  path: string;
  instructions: string;
  nextContent: string;
  strategyUsed: SemanticEditStrategyUsed;
  diagnostics: SemanticEditDiagnostic[];
  changedRanges: SemanticEditChangedRange[];
  replacements?: number;
};

type ExpectedChange = {
  search?: string;
  replacement?: string;
  replace?: string;
  all?: boolean;
  patch?: string;
  content?: string;
  newContent?: string;
  fullContent?: string;
  explicitLargeRewriteApproval?: boolean;
  allowLargeRewrite?: boolean;
  approvalWarningAccepted?: boolean;
};

export function selectSemanticEdit(args: Record<string, unknown>, currentContent: string): SemanticEditPlan {
  const filePath = requireString(args.path, 'path');
  const strategy = normalizeStrategy(args.strategy);
  const instructions = requireString(args.instructions, 'instructions');
  if (!instructions.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "instructions" must not be empty.', {
      argument: 'instructions'
    });
  }

  const expectedChange = normalizeExpectedChange(args.expectedChange);
  const candidates = getCandidateStrategies(strategy, expectedChange);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      if (candidate === 'exact_replace') {
        return selectExactReplace(filePath, instructions, currentContent, expectedChange);
      }
      if (candidate === 'patch') {
        return selectPatch(filePath, instructions, currentContent, expectedChange);
      }
      return selectRewrite(filePath, instructions, currentContent, expectedChange);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      if (strategy !== 'auto') {
        throw error;
      }
    }
  }

  throw createToolError('INVALID_ARGUMENT', 'Unable to select a semantic edit strategy from expectedChange.', {
    strategy,
    errors
  });
}

export function changedRangesFromLineRange(
  filePath: string,
  range: Record<string, unknown>
): SemanticEditChangedRange[] {
  if (
    typeof range.changedStartLine !== 'number' ||
    typeof range.changedStartColumn !== 'number' ||
    typeof range.changedEndLine !== 'number' ||
    typeof range.changedEndColumn !== 'number'
  ) {
    return [];
  }

  return [
    {
      path: filePath,
      changedStartLine: range.changedStartLine,
      changedStartColumn: range.changedStartColumn,
      changedEndLine: range.changedEndLine,
      changedEndColumn: range.changedEndColumn
    }
  ];
}

function selectExactReplace(
  filePath: string,
  instructions: string,
  currentContent: string,
  expectedChange: ExpectedChange
): SemanticEditPlan {
  const search = expectedChange.search;
  const replacement = expectedChange.replacement ?? expectedChange.replace;
  if (typeof search !== 'string' || typeof replacement !== 'string') {
    throw createToolError('INVALID_ARGUMENT', 'Exact replace requires expectedChange.search and replacement.', {
      strategy: 'exact_replace'
    });
  }
  if (!search) {
    throw createToolError('INVALID_ARGUMENT', 'Exact replace expectedChange.search must not be empty.', {
      strategy: 'exact_replace'
    });
  }
  if (!currentContent.includes(search)) {
    throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
  }

  const replacements = expectedChange.all ? currentContent.split(search).length - 1 : 1;
  const nextContent = expectedChange.all
    ? currentContent.split(search).join(replacement)
    : currentContent.replace(search, replacement);

  return createPlan(filePath, instructions, currentContent, nextContent, 'exact_replace', [], replacements);
}

function selectPatch(
  filePath: string,
  instructions: string,
  currentContent: string,
  expectedChange: ExpectedChange
): SemanticEditPlan {
  if (typeof expectedChange.patch !== 'string') {
    throw createToolError('INVALID_ARGUMENT', 'Patch strategy requires expectedChange.patch.', {
      strategy: 'patch'
    });
  }

  const appliedPatch = applyUnifiedPatchToContents(expectedChange.patch, { [filePath]: currentContent });
  if (appliedPatch.files.length !== 1 || appliedPatch.files[0]?.path !== filePath) {
    throw createToolError('INVALID_ARGUMENT', 'edit_file patch must modify exactly the requested path.', {
      path: filePath,
      patchFiles: appliedPatch.files.map((file) => file.path)
    });
  }

  return createPlan(filePath, instructions, currentContent, appliedPatch.files[0].newContent, 'patch', []);
}

function selectRewrite(
  filePath: string,
  instructions: string,
  currentContent: string,
  expectedChange: ExpectedChange
): SemanticEditPlan {
  const content = expectedChange.content ?? expectedChange.newContent ?? expectedChange.fullContent;
  if (typeof content !== 'string') {
    throw createToolError('INVALID_ARGUMENT', 'Rewrite strategy requires expectedChange.content.', {
      strategy: 'rewrite'
    });
  }

  const currentBytes = Buffer.byteLength(currentContent, 'utf8');
  const nextBytes = Buffer.byteLength(content, 'utf8');
  const largeRewriteAllowed =
    expectedChange.explicitLargeRewriteApproval ||
    expectedChange.allowLargeRewrite ||
    expectedChange.approvalWarningAccepted;

  if (currentBytes > SMALL_FILE_REWRITE_MAX_BYTES && !largeRewriteAllowed) {
    throw createToolError(
      'INVALID_ARGUMENT',
      `Full rewrite of large file ${filePath} requires expectedChange.explicitLargeRewriteApproval=true.`,
      {
        path: filePath,
        currentBytes,
        nextBytes,
        maxSmallFileBytes: SMALL_FILE_REWRITE_MAX_BYTES,
        approvalWarningRequired: true
      }
    );
  }

  const diagnostics: SemanticEditDiagnostic[] = [];
  const strategyUsed: SemanticEditStrategyUsed =
    currentBytes > SMALL_FILE_REWRITE_MAX_BYTES ? 'rewrite_full_file' : 'rewrite_small_file';
  if (strategyUsed === 'rewrite_full_file') {
    diagnostics.push({
      level: 'warning',
      message: 'Full rewrite of a large file was explicitly requested and will require approval preview.'
    });
  }

  return createPlan(filePath, instructions, currentContent, content, strategyUsed, diagnostics);
}

function createPlan(
  filePath: string,
  instructions: string,
  currentContent: string,
  nextContent: string,
  strategyUsed: SemanticEditStrategyUsed,
  diagnostics: SemanticEditDiagnostic[],
  replacements?: number
): SemanticEditPlan {
  const changedRange = getChangedLineRange(currentContent, nextContent);

  return {
    path: filePath,
    instructions,
    nextContent,
    strategyUsed,
    diagnostics,
    changedRanges: changedRangesFromLineRange(filePath, changedRange),
    ...(replacements === undefined ? {} : { replacements })
  };
}

function normalizeStrategy(value: unknown): SemanticEditRequestedStrategy {
  const strategy = typeof value === 'string' ? value : 'auto';
  if (strategy === 'auto' || strategy === 'exact_replace' || strategy === 'patch' || strategy === 'rewrite') {
    return strategy;
  }

  throw createToolError('INVALID_ARGUMENT', `Unsupported edit_file strategy: ${strategy}`, {
    strategy
  });
}

function normalizeExpectedChange(value: unknown): ExpectedChange {
  if (typeof value === 'string') {
    return { content: value };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createToolError('INVALID_ARGUMENT', 'Tool argument "expectedChange" must be an object.', {
      argument: 'expectedChange'
    });
  }

  return value as ExpectedChange;
}

function getCandidateStrategies(
  strategy: SemanticEditRequestedStrategy,
  expectedChange: ExpectedChange
): Array<Exclude<SemanticEditRequestedStrategy, 'auto'>> {
  if (strategy !== 'auto') {
    return [strategy];
  }

  const candidates: Array<Exclude<SemanticEditRequestedStrategy, 'auto'>> = [];
  if (typeof expectedChange.search === 'string') {
    candidates.push('exact_replace');
  }
  if (typeof expectedChange.patch === 'string') {
    candidates.push('patch');
  }
  if (
    typeof expectedChange.content === 'string' ||
    typeof expectedChange.newContent === 'string' ||
    typeof expectedChange.fullContent === 'string'
  ) {
    candidates.push('rewrite');
  }

  return candidates;
}

function getChangedLineRange(beforeContent: string, afterContent: string): Record<string, number> {
  if (beforeContent === afterContent) {
    return {};
  }

  const beforeLines = beforeContent.split(/\r?\n/);
  const afterLines = afterContent.split(/\r?\n/);
  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
    start += 1;
  }

  let beforeEnd = beforeLines.length - 1;
  let afterEnd = afterLines.length - 1;
  while (beforeEnd >= start && afterEnd >= start && beforeLines[beforeEnd] === afterLines[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const changedStartLine = start + 1;
  const changedEndLine = Math.max(changedStartLine, afterEnd + 1);
  return {
    changedStartLine,
    changedStartColumn: 1,
    changedEndLine,
    changedEndColumn: afterLines[changedEndLine - 1]?.length + 1 || 1
  };
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a string.`, { argument: name });
  }

  return value;
}
