import { splitDiffLines } from './splitDiffLines';

export function createUnifiedDiff(filePath: string, oldContent: string | undefined, newContent: string): string {
  const oldLines = splitDiffLines(oldContent || '');
  const newLines = splitDiffLines(newContent);
  if (oldContent !== undefined && oldContent === newContent) {
    return '';
  }

  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix += 1;
  }

  let oldSuffix = oldLines.length - 1;
  let newSuffix = newLines.length - 1;
  while (oldSuffix >= prefix && newSuffix >= prefix && oldLines[oldSuffix] === newLines[newSuffix]) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }

  const oldChunk = oldLines.slice(prefix, oldSuffix + 1);
  const newChunk = newLines.slice(prefix, newSuffix + 1);
  const oldStart = oldChunk.length ? prefix + 1 : 0;
  const newStart = newChunk.length ? prefix + 1 : 0;
  const header = [`--- ${oldContent === undefined ? '/dev/null' : `a/${filePath}`}`, `+++ b/${filePath}`];
  const hunk = [`@@ -${oldStart},${oldChunk.length} +${newStart},${newChunk.length} @@`];

  return [...header, ...hunk, ...oldChunk.map((line) => `-${line}`), ...newChunk.map((line) => `+${line}`), ''].join(
    '\n'
  );
}
