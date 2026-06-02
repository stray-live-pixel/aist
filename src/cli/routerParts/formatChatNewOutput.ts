import { ChatCommandResult } from './ChatCommandResult';
import { formatJsonOutput } from './formatJsonOutput';

export function formatChatNewOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, chat: result.chat });
  }

  return `Created chat ${result.chat.id}
Workspace: ${result.workspaceRoot}
Model: ${result.chat.model}
`;
}
