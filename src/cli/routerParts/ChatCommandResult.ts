import { ChatJson } from './ChatJson';
import { ChatSummaryJson } from './ChatSummaryJson';

export type ChatCommandResult = {
  readonly workspaceRoot: string;
  readonly chat: ChatJson;
  readonly summary: ChatSummaryJson;
};
