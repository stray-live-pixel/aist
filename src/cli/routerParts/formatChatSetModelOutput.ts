import { ChatCommandResult } from './ChatCommandResult';
import { formatJsonOutput } from './formatJsonOutput';

export function formatChatSetModelOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, chat: result.chat });
  }

  return `Set chat ${result.chat.id} model to ${result.chat.model}.\n`;
}
