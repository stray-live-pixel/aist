import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { ChatCommandResult } from './ChatCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { resolveChatModel } from './resolveChatModel';
import { resolveChatWorkspaceRoot } from './resolveChatWorkspaceRoot';
import { toChatCommandResult } from './toChatCommandResult';

export async function createChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatNew' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const model = command.model || (await resolveChatModel(workspaceRoot, options));
  const chat = await repository.create({ model });
  return toChatCommandResult(workspaceRoot, chat);
}
