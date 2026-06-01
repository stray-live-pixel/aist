import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { ChatCommandResult } from './ChatCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { requireChat } from './requireChat';
import { resolveChatWorkspaceRoot } from './resolveChatWorkspaceRoot';
import { toChatCommandResult } from './toChatCommandResult';

export async function clearChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatClear' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  await requireChat(repository, command.chatId);
  const chat = await repository.clear(command.chatId);
  return toChatCommandResult(workspaceRoot, chat);
}
