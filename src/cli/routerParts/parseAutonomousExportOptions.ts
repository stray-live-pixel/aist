import { type AutonomousExportFormat } from '../../core/processes/autonomous';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseAutonomousFormatOptionToken } from './parseAutonomousFormatOptionToken';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseAutonomousExportOptions(args: readonly string[]): {
  readonly sessionId: string;
  readonly workspace?: string;
  readonly format: AutonomousExportFormat;
  readonly showHelp: boolean;
} {
  let sessionId: string | undefined;
  let workspace: string | undefined;
  let format: AutonomousExportFormat = 'markdown';

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { sessionId: '', workspace, format, showHelp: true };
    }

    const workspaceResult = parseWorkspaceOptionToken('autonomous export', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const formatResult = parseAutonomousFormatOptionToken(args, index, format);
    if (formatResult.matched) {
      format = formatResult.format;
      index = formatResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'autonomous export': ${token}`);
    }

    if (sessionId !== undefined) {
      throw new CliUsageError(`Unexpected argument for 'autonomous export': ${token}`);
    }
    sessionId = token;
  }

  if (!sessionId) {
    throw new CliUsageError(`'autonomous export' requires a session id.`);
  }

  return { sessionId, workspace, format, showHelp: false };
}
