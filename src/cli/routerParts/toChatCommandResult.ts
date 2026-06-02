import { type Chat } from '../../core/shared/types/types';
import { ChatCommandResult } from './ChatCommandResult';
import { toChatJson } from './toChatJson';
import { toChatSummary } from './toChatSummary';
import { toChatSummaryJson } from './toChatSummaryJson';

export function toChatCommandResult(workspaceRoot: string, chat: Chat): ChatCommandResult {
  return {
    workspaceRoot,
    chat: toChatJson(chat),
    summary: toChatSummaryJson(toChatSummary(chat))
  };
}
