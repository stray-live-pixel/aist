import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';

export type ParsedPatchFile = {
  oldPath?: string;
  newPath?: string;
  path: string;
  hunks: PatchHunk[];
  isNewFile: boolean;
};

export type PatchHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: PatchHunkLine[];
};

export type PatchHunkLine = {
  type: 'context' | 'add' | 'remove';
  content: string;
  noNewlineAtEnd?: boolean;
};

export type AppliedPatchFile = {
  path: string;
  oldContent: string | undefined;
  newContent: string;
  created: boolean;
  changedStartLine?: number;
  changedStartColumn?: number;
  changedEndLine?: number;
  changedEndColumn?: number;
};

export type AppliedPatch = {
  files: AppliedPatchFile[];
};

export function parseUnifiedPatch(patch: string): ParsedPatchFile[] {
  if (!patch.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Patch must not be empty.');
  }

  if (containsBinaryPatchMarker(patch)) {
    throw createToolError('INVALID_ARGUMENT', 'Binary patches are not supported.');
  }

  const lines = patch.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const files: ParsedPatchFile[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].startsWith('--- ')) {
      index += 1;
      continue;
    }

    const oldPath = parsePatchPath(lines[index], '---');
    index += 1;

    if (index >= lines.length || !lines[index].startsWith('+++ ')) {
      throw createToolError('INVALID_ARGUMENT', 'Invalid unified diff: missing +++ file header.');
    }

    const newPath = parsePatchPath(lines[index], '+++');
    const selectedPath = newPath ?? oldPath;
    if (!selectedPath) {
      throw createToolError('INVALID_ARGUMENT', 'File deletion patches are not supported.');
    }

    if (oldPath && newPath && oldPath !== newPath) {
      throw createToolError('INVALID_ARGUMENT', 'Rename patches are not supported.', { oldPath, newPath });
    }

    const file: ParsedPatchFile = {
      oldPath,
      newPath,
      path: selectedPath,
      hunks: [],
      isNewFile: !oldPath
    };
    index += 1;

    while (index < lines.length) {
      if (lines[index].startsWith('--- ')) {
        break;
      }

      if (!lines[index].startsWith('@@ ')) {
        index += 1;
        continue;
      }

      const hunk = parseHunkHeader(lines[index], file.path);
      index += 1;

      while (index < lines.length && !lines[index].startsWith('@@ ') && !lines[index].startsWith('--- ')) {
        const line = lines[index];
        if (line.startsWith('\\')) {
          markPreviousLineWithoutTrailingNewline(hunk, file.path);
          index += 1;
          continue;
        }

        if (line.startsWith(' ')) {
          hunk.lines.push({ type: 'context', content: line.slice(1) });
        } else if (line.startsWith('+')) {
          hunk.lines.push({ type: 'add', content: line.slice(1) });
        } else if (line.startsWith('-')) {
          hunk.lines.push({ type: 'remove', content: line.slice(1) });
        } else if (line === '') {
          break;
        } else {
          throw createToolError('INVALID_ARGUMENT', `Invalid unified diff hunk line in ${file.path}.`, {
            path: file.path,
            line
          });
        }

        index += 1;
      }

      validateHunkLineCounts(hunk, file.path);
      file.hunks.push(hunk);
    }

    if (!file.hunks.length) {
      throw createToolError('INVALID_ARGUMENT', `Patch for ${file.path} does not contain hunks.`, {
        path: file.path
      });
    }

    files.push(file);
  }

  if (!files.length) {
    throw createToolError('INVALID_ARGUMENT', 'Patch must contain at least one unified diff file section.');
  }

  return files;
}

export function applyUnifiedPatchToContents(
  patch: string,
  contentsByPath: Record<string, string | undefined>
): AppliedPatch {
  const files = parseUnifiedPatch(patch);

  return {
    files: files.map((file) => {
      const oldContent = contentsByPath[file.path];
      if (oldContent === undefined && !file.isNewFile) {
        throw createToolError('FILE_NOT_FOUND', `File not found: ${file.path}`, { path: file.path });
      }

      const newContent = applyFilePatch(file, oldContent ?? '');
      return {
        path: file.path,
        oldContent,
        newContent,
        created: oldContent === undefined,
        ...getChangedLineRange(oldContent ?? '', newContent)
      };
    })
  };
}

function applyFilePatch(file: ParsedPatchFile, oldContent: string): string {
  const sourceLines = file.isNewFile && oldContent === '' ? [] : splitContentLines(oldContent);
  const resultLines: string[] = [];
  let cursor = 0;

  for (const hunk of file.hunks) {
    const targetIndex = hunk.oldStart === 0 ? 0 : hunk.oldStart - 1;
    if (targetIndex < cursor) {
      throw createToolError('INVALID_ARGUMENT', `Patch hunks overlap in ${file.path}.`, { path: file.path });
    }

    resultLines.push(...sourceLines.slice(cursor, targetIndex));
    let sourceIndex = targetIndex;

    for (const line of hunk.lines) {
      const expected = toContentLine(line);
      if (line.type === 'context') {
        assertPatchLineMatches(file.path, sourceLines[sourceIndex], expected, sourceIndex + 1);
        resultLines.push(sourceLines[sourceIndex]);
        sourceIndex += 1;
        continue;
      }

      if (line.type === 'remove') {
        assertPatchLineMatches(file.path, sourceLines[sourceIndex], expected, sourceIndex + 1);
        sourceIndex += 1;
        continue;
      }

      resultLines.push(expected);
    }

    cursor = sourceIndex;
  }

  resultLines.push(...sourceLines.slice(cursor));
  return resultLines.join('');
}

function parsePatchPath(line: string, marker: '---' | '+++'): string | undefined {
  const raw = line.slice(marker.length).trim();
  const pathToken = raw.split('\t')[0].trim();
  if (pathToken === '/dev/null') {
    return undefined;
  }

  return normalizeDiffPath(pathToken);
}

function normalizeDiffPath(rawPath: string): string {
  const unquoted = unquoteDiffPath(rawPath);
  if (
    !unquoted ||
    unquoted.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(unquoted) ||
    path.isAbsolute(unquoted) ||
    unquoted.includes('\0')
  ) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Patch path must be workspace-relative: ${rawPath}`, {
      path: rawPath
    });
  }

  const withoutPrefix = unquoted.startsWith('a/') || unquoted.startsWith('b/') ? unquoted.slice(2) : unquoted;
  const normalized = path.posix.normalize(withoutPrefix.replace(/\\/g, '/'));

  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw createToolError('PATH_OUTSIDE_WORKSPACE', `Patch path is outside the workspace: ${rawPath}`, {
      path: rawPath
    });
  }

  return normalized;
}

function unquoteDiffPath(rawPath: string): string {
  if (rawPath.length >= 2 && rawPath.startsWith('"') && rawPath.endsWith('"')) {
    return rawPath.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  return rawPath;
}

function parseHunkHeader(line: string, filePath: string): PatchHunk {
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
  if (!match) {
    throw createToolError('INVALID_ARGUMENT', `Invalid unified diff hunk header in ${filePath}.`, {
      path: filePath,
      header: line
    });
  }

  return {
    oldStart: Number(match[1]),
    oldLines: match[2] === undefined ? 1 : Number(match[2]),
    newStart: Number(match[3]),
    newLines: match[4] === undefined ? 1 : Number(match[4]),
    lines: []
  };
}

function validateHunkLineCounts(hunk: PatchHunk, filePath: string): void {
  const oldLineCount = hunk.lines.filter((line) => line.type !== 'add').length;
  const newLineCount = hunk.lines.filter((line) => line.type !== 'remove').length;

  if (oldLineCount !== hunk.oldLines || newLineCount !== hunk.newLines) {
    throw createToolError('INVALID_ARGUMENT', `Unified diff hunk line count mismatch in ${filePath}.`, {
      path: filePath,
      expectedOldLines: hunk.oldLines,
      actualOldLines: oldLineCount,
      expectedNewLines: hunk.newLines,
      actualNewLines: newLineCount
    });
  }
}

function markPreviousLineWithoutTrailingNewline(hunk: PatchHunk, filePath: string): void {
  const previous = hunk.lines[hunk.lines.length - 1];
  if (!previous) {
    throw createToolError('INVALID_ARGUMENT', `Invalid no-newline marker in ${filePath}.`, { path: filePath });
  }

  previous.noNewlineAtEnd = true;
}

function assertPatchLineMatches(filePath: string, actual: string | undefined, expected: string, line: number): void {
  if (actual === expected) {
    return;
  }

  throw createToolError('INVALID_ARGUMENT', `Patch does not apply cleanly to ${filePath} at line ${line}.`, {
    path: filePath,
    line
  });
}

function splitContentLines(content: string): string[] {
  return content.match(/[^\n]*\n|[^\n]+/g) ?? [];
}

function toContentLine(line: PatchHunkLine): string {
  return `${line.content}${line.noNewlineAtEnd ? '' : '\n'}`;
}

function containsBinaryPatchMarker(patch: string): boolean {
  return /(^|\n)(GIT binary patch|Binary files .+ differ)(\n|$)/.test(patch);
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
