import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { clearChatCommandResult } from './clearChatCommandResult';
import { createChatCommandResult } from './createChatCommandResult';
import { formatChatClearOutput } from './formatChatClearOutput';
import { formatChatGetOutput } from './formatChatGetOutput';
import { formatChatListOutput } from './formatChatListOutput';
import { formatChatNewOutput } from './formatChatNewOutput';
import { formatChatSetModelOutput } from './formatChatSetModelOutput';
import { getChatCommandResult } from './getChatCommandResult';
import { listChatsCommandResult } from './listChatsCommandResult';
import { runChatAskCommand } from './runChatAskCommand';
import { setChatModelCommandResult } from './setChatModelCommandResult';

export async function runChatCommand(
  command: Extract<CliCommand, { kind: `chat${string}` }>,
  options: RunCliOptions,
  stdout: CliWriter,
  stderr: CliWriter
): Promise<number> {
  if (command.kind === 'chatNew') {
    const result = await createChatCommandResult(command, options);
    stdout(formatChatNewOutput(result, command.json));
    return 0;
  }

  if (command.kind === 'chatList') {
    const result = await listChatsCommandResult(command, options);
    stdout(formatChatListOutput(result, command.json));
    return 0;
  }

  if (command.kind === 'chatGet') {
    const result = await getChatCommandResult(command, options);
    stdout(formatChatGetOutput(result, command.json));
    return 0;
  }

  if (command.kind === 'chatClear') {
    const result = await clearChatCommandResult(command, options);
    stdout(formatChatClearOutput(result, command.json));
    return 0;
  }

  if (command.kind === 'chatSetModel') {
    const result = await setChatModelCommandResult(command, options);
    stdout(formatChatSetModelOutput(result, command.json));
    return 0;
  }

  return runChatAskCommand(command, options, stdout, stderr);
}
