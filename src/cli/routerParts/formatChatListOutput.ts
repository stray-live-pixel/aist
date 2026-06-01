import { ChatListCommandResult } from './ChatListCommandResult';
import { formatJsonOutput } from './formatJsonOutput';
import { formatTimestamp } from './formatTimestamp';

export function formatChatListOutput(result: ChatListCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  if (result.chats.length === 0) {
    return `AIST chats
Workspace: ${result.workspaceRoot}
(no chats)
`;
  }

  const lines = result.chats.map((chat) => {
    const updatedAt = formatTimestamp(chat.updatedAt);
    return `- ${chat.id}  ${chat.title}  [${chat.model}]  messages: ${chat.messageCount}  updated: ${updatedAt}`;
  });
  return `AIST chats
Workspace: ${result.workspaceRoot}
${lines.join('\n')}
`;
}
