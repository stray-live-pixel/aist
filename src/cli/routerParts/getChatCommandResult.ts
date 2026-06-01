import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { ChatCommandResult } from './ChatCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { requireChat } from './requireChat';
import { resolveChatWorkspaceRoot } from './resolveChatWorkspaceRoot';
import { toChatCommandResult } from './toChatCommandResult';

export async function getChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatGet' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const chat = await requireChat(repository, command.chatId);
  return toChatCommandResult(workspaceRoot, chat);
}
