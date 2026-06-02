import { CliUsageError } from './CliUsageError';

export function parseWorkspaceOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly workspace?: string; readonly index: number } {
  const token = args[index];

  if (token === '--workspace') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
    }

    return { matched: true, workspace: value, index: index + 1 };
  }

  if (token.startsWith('--workspace=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
    }

    const value = token.slice('--workspace='.length);
    if (value.trim() === '') {
      throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
    }

    return { matched: true, workspace: value, index };
  }

  return { matched: false, workspace: current, index };
}
