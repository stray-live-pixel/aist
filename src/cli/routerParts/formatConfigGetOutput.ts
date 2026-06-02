import { ConfigGetResult } from './ConfigGetResult';
import { flattenJsonObject } from './flattenJsonObject';
import { formatJsonOutput } from './formatJsonOutput';
import { formatJsonValueForText } from './formatJsonValueForText';

export function formatConfigGetOutput(result: ConfigGetResult, json: boolean): string {
  if (json) {
    if ('key' in result) {
      return formatJsonOutput({
        key: result.key,
        value: result.value === undefined ? null : result.value,
        source: result.source,
        redacted: result.redacted
      });
    }

    return formatJsonOutput({
      values: result.values,
      redacted: result.redacted
    });
  }

  if ('key' in result) {
    return `${result.key}: ${result.value === undefined ? '<unset>' : formatJsonValueForText(result.value)}\n`;
  }

  const lines = flattenJsonObject(result.values);
  if (lines.length === 0) {
    return 'AIST config\n(no settings)\n';
  }

  return `AIST config\n${lines.join('\n')}\n`;
}
