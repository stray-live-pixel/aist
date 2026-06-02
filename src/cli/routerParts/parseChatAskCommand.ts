import { CliApprovalMode } from './CliApprovalMode';
import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseApprovalModeOptionToken } from './parseApprovalModeOptionToken';
import { parsePromptOptionToken } from './parsePromptOptionToken';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseChatAskCommand(args: readonly string[]): CliCommand {
  let chatId: string | undefined;
  let workspace: string | undefined;
  let prompt: string | undefined;
  let stdin = false;
  let jsonl = false;
  let approvalMode: CliApprovalMode = 'ask';

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--jsonl') {
      jsonl = true;
      continue;
    }

    if (token === '--stdin') {
      stdin = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('chat ask', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const promptResult = parsePromptOptionToken('chat ask', args, index, prompt);
    if (promptResult.matched) {
      prompt = promptResult.prompt;
      index = promptResult.index;
      continue;
    }

    const approvalResult = parseApprovalModeOptionToken('chat ask', args, index, approvalMode);
    if (approvalResult.matched) {
      approvalMode = approvalResult.approvalMode;
      index = approvalResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'chat ask': ${token}`);
    }

    if (chatId !== undefined) {
      throw new CliUsageError(`Unexpected argument for 'chat ask': ${token}`);
    }

    chatId = token;
  }

  if (!chatId) {
    throw new CliUsageError(`'chat ask' requires a chat id.`);
  }

  if (!jsonl) {
    throw new CliUsageError(`'chat ask' currently requires --jsonl.`);
  }

  if (stdin && prompt !== undefined) {
    throw new CliUsageError(`'chat ask' accepts either --prompt or --stdin, not both.`);
  }

  if (!stdin && prompt === undefined) {
    throw new CliUsageError(`'chat ask' requires --prompt <text> or --stdin.`);
  }

  return { kind: 'chatAsk', chatId, workspace, prompt, stdin, jsonl, approvalMode };
}
