import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseAuthCommand } from './parseAuthCommand';
import { parseAutonomousCommand } from './parseAutonomousCommand';
import { parseChatCommand } from './parseChatCommand';
import { parseConfigCommand } from './parseConfigCommand';
import { parseDaemonCommand } from './parseDaemonCommand';
import { parseModelsCommand } from './parseModelsCommand';
import { parseWorkspaceOptions } from './parseWorkspaceOptions';

export function parseCliArgs(args: readonly string[]): CliCommand {
  if (args.length === 0) {
    return { kind: 'help' };
  }

  const [command, ...rest] = args;

  if (command === '--help' || command === '-h') {
    assertNoExtraArgs(rest, command);
    return { kind: 'help' };
  }

  if (command === '--version' || command === '-v') {
    assertNoExtraArgs(rest, command);
    return { kind: 'version' };
  }

  if (command === 'doctor' || command === 'paths') {
    const options = parseWorkspaceOptions(command, rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }

    return { kind: command, workspace: options.workspace };
  }

  if (command === 'daemon') {
    return parseDaemonCommand(rest);
  }

  if (command === 'config') {
    return parseConfigCommand(rest);
  }

  if (command === 'chat') {
    return parseChatCommand(rest);
  }

  if (command === 'auth') {
    return parseAuthCommand(rest);
  }

  if (command === 'models') {
    return parseModelsCommand(rest);
  }

  if (command === 'autonomous') {
    return parseAutonomousCommand(rest);
  }

  if (command.startsWith('-')) {
    throw new CliUsageError(`Unknown option: ${command}`);
  }

  throw new CliUsageError(`Unknown command: ${command}`);
}
