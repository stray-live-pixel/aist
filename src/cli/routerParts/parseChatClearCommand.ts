import { CliCommand } from './CliCommand';
import { parseChatIdWorkspaceJsonOptions } from './parseChatIdWorkspaceJsonOptions';

export function parseChatClearCommand(args: readonly string[]): CliCommand {
  const parsed = parseChatIdWorkspaceJsonOptions('chat clear', args);
  if (parsed.showHelp) {
    return { kind: 'help' };
  }

  return { kind: 'chatClear', chatId: parsed.chatId, workspace: parsed.workspace, json: parsed.json };
}
