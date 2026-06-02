import { asRecord } from './asRecord';
import { changedRange } from './changedRange';
import { removeUndefined } from './removeUndefined';

export function compactDiffFile(value: unknown): Record<string, unknown> {
  const file = asRecord(value) || {};
  return removeUndefined({
    path: file.path,
    created: file.created,
    bytes: file.bytes,
    replacements: file.replacements,
    generatedReplacements: file.generatedReplacements,
    strategyUsed: file.strategyUsed,
    diagnostics: file.diagnostics,
    changedRanges: file.changedRanges,
    changed: file.changed,
    ...changedRange(file)
  });
}
