import { removeUndefined } from './removeUndefined';

export function changedRange(value: Record<string, unknown>): Record<string, unknown> {
  return removeUndefined({
    changedStartLine: value.changedStartLine,
    changedStartColumn: value.changedStartColumn,
    changedEndLine: value.changedEndLine,
    changedEndColumn: value.changedEndColumn
  });
}
