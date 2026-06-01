import { ChatCommandResult } from './ChatCommandResult';
import { formatChatMessageLine } from './formatChatMessageLine';
import { formatJsonOutput } from './formatJsonOutput';
import { formatTimestamp } from './formatTimestamp';

export function formatChatGetOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, chat: result.chat });
  }

  const messages =
    result.chat.messages.length === 0
      ? '(no messages)'
      : result.chat.messages.map((message) => formatChatMessageLine(message)).join('\n');
  return `AIST chat ${result.chat.id}
Workspace: ${result.workspaceRoot}
Title: ${result.chat.title}
Model: ${result.chat.model}
Messages: ${result.summary.messageCount}
Updated: ${formatTimestamp(result.chat.updatedAt)}

${messages}
`;
}
