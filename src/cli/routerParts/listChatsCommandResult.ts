import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { ChatListCommandResult } from './ChatListCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { resolveChatWorkspaceRoot } from './resolveChatWorkspaceRoot';
import { toChatSummaryJson } from './toChatSummaryJson';

export async function listChatsCommandResult(
  command: Extract<CliCommand, { kind: 'chatList' }>,
  options: RunCliOptions
): Promise<ChatListCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const chats = await repository.list();
  return {
    workspaceRoot,
    chats: chats.map(toChatSummaryJson)
  };
}
