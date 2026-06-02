export type ChatSummaryJson = {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly previousChatId: string | null;
  readonly compactedAt: number | null;
  readonly compactionModel: string | null;
  readonly messageCount: number;
  readonly lastUserMessage: string;
  readonly busy: boolean;
  readonly lastMessageAt: number;
  readonly updatedAt: number;
};
