import { CliUsageError } from './CliUsageError';
import { parseStringOptionToken } from './parseStringOptionToken';

export function parseWebCommand(args: readonly string[]) {
  let workspace: string | undefined;
  let host = '127.0.0.1';
  let port = 4317;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      return { kind: 'help' as const };
    }

    const workspaceMatch = parseStringOptionToken('web', '--workspace', args, index, workspace);
    if (workspaceMatch.matched) {
      workspace = workspaceMatch.value;
      index = workspaceMatch.index;
      continue;
    }

    const hostMatch = parseStringOptionToken('web', '--host', args, index, host === '127.0.0.1' ? undefined : host);
    if (hostMatch.matched) {
      host = hostMatch.value || host;
      index = hostMatch.index;
      continue;
    }

    const portMatch = parseStringOptionToken('web', '--port', args, index, port === 4317 ? undefined : String(port));
    if (portMatch.matched) {
      const value = Number(portMatch.value);
      if (!Number.isInteger(value) || value <= 0 || value > 65_535) {
        throw new CliUsageError(`Option --port for 'web' must be a valid TCP port.`);
      }

      port = value;
      index = portMatch.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'web': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'web': ${token}`);
  }

  return { kind: 'web' as const, workspace, host, port };
}
