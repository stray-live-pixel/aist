import { type ConfigScope } from '../../core/app/config/config';
import { type JsonValue } from '../../core/shared/types/types';
import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseConfigValue } from './parseConfigValue';
import { parseScopeOptionToken } from './parseScopeOptionToken';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseConfigSetCommand(args: readonly string[]): CliCommand {
  let key: string | undefined;
  let value: JsonValue | undefined;
  let scope: ConfigScope | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const scopeResult = parseScopeOptionToken('config set', args, index, scope);
    if (scopeResult.matched) {
      scope = scopeResult.scope;
      index = scopeResult.index;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('config set', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'config set': ${token}`);
    }

    if (key === undefined) {
      key = token;
      continue;
    }

    if (value === undefined) {
      value = parseConfigValue(token);
      continue;
    }

    throw new CliUsageError(`Unexpected argument for 'config set': ${token}`);
  }

  if (!key) {
    throw new CliUsageError(`'config set' requires a key.`);
  }

  if (value === undefined) {
    throw new CliUsageError(`'config set' requires a value.`);
  }

  if (!scope) {
    throw new CliUsageError(`'config set' requires --scope global|workspace.`);
  }

  return { kind: 'configSet', key, value, scope, workspace, json };
}
