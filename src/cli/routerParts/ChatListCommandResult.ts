import { ChatSummaryJson } from './ChatSummaryJson';

export type ChatListCommandResult = {
  readonly workspaceRoot: string;
  readonly chats: readonly ChatSummaryJson[];
};
