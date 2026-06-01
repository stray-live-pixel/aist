import { ConfigSetResult } from './ConfigSetResult';
import { formatJsonOutput } from './formatJsonOutput';

export function formatConfigSetOutput(result: ConfigSetResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  return `Set ${result.key} in ${result.scope} config.\n`;
}
