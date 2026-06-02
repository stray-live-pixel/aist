import { asRecord } from './asRecord';

export function getExecutableResult(uiResult: Record<string, unknown>): Record<string, unknown> {
  return asRecord(uiResult.result) ?? uiResult;
}
