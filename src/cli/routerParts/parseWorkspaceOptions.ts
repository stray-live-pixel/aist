import path from 'node:path';

import { CliUsageError } from './CliUsageError';
import { WorkspaceOptions } from './WorkspaceOptions';
import { assertNoExtraArgs } from './assertNoExtraArgs';

export function parseWorkspaceOptions(command: string, args: readonly string[]): WorkspaceOptions {
  let workspace: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { workspace, showHelp: true };
    }

    if (token === '--workspace') {
      if (workspace !== undefined) {
        throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
      }

      workspace = value;
      index += 1;
      continue;
    }

    if (token.startsWith('--workspace=')) {
      if (workspace !== undefined) {
        throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
      }

      const value = token.slice('--workspace='.length);
      if (value.trim() === '') {
        throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
      }

      workspace = value;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
  }

  return { workspace, showHelp: false };
}
