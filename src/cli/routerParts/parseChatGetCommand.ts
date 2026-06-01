import { CliCommand } from './CliCommand';
import { parseChatIdWorkspaceJsonOptions } from './parseChatIdWorkspaceJsonOptions';

export function parseChatGetCommand(args: readonly string[]): CliCommand {
  const parsed = parseChatIdWorkspaceJsonOptions('chat get', args);
  if (parsed.showHelp) {
    return { kind: 'help' };
  }

  return { kind: 'chatGet', chatId: parsed.chatId, workspace: parsed.workspace, json: parsed.json };
}
