import { CliCommand } from './CliCommand';
import { parseChatWorkspaceJsonOptions } from './parseChatWorkspaceJsonOptions';

export function parseChatListCommand(args: readonly string[]): CliCommand {
  const options = parseChatWorkspaceJsonOptions('chat list', args);
  if (options.showHelp) {
    return { kind: 'help' };
  }

  return { kind: 'chatList', workspace: options.workspace, json: options.json };
}
