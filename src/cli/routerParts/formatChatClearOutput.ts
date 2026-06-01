import { ChatCommandResult } from './ChatCommandResult';
import { formatJsonOutput } from './formatJsonOutput';

export function formatChatClearOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, cleared: true, chat: result.chat });
  }

  return `Cleared chat ${result.chat.id}.\n`;
}
