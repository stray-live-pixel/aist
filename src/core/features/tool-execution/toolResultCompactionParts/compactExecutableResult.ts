import { compactBashResult } from './compactBashResult';
import { compactDiffToolResult } from './compactDiffToolResult';
import { compactErrorResult } from './compactErrorResult';
import { compactGenericResult } from './compactGenericResult';
import { compactGrepSearchResult } from './compactGrepSearchResult';
import { compactReadFileResult } from './compactReadFileResult';
import { isLargeSerialized } from './isLargeSerialized';

export function compactExecutableResult(
  toolName: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>
): Record<string, unknown> {
  if (result.ok === false) {
    return compactErrorResult(toolName, result);
  }

  switch (toolName) {
    case 'read_file':
      return compactReadFileResult(result);
    case 'grep_search':
      return compactGrepSearchResult(result);
    case 'run_bash_script':
      return compactBashResult(result);
    case 'write_file':
    case 'replace_in_file':
      return compactDiffToolResult(toolName, result);
    default:
      return isLargeSerialized(result) ? compactGenericResult(toolName, args, result) : result;
  }
}
