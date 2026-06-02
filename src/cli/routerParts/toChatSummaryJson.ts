import { type ChatSummary } from '../../core/shared/types/types';
import { ChatSummaryJson } from './ChatSummaryJson';

export function toChatSummaryJson(summary: ChatSummary): ChatSummaryJson {
  return {
    id: summary.id,
    title: summary.title,
    model: summary.model,
    previousChatId: summary.previousChatId ?? null,
    compactedAt: summary.compactedAt ?? null,
    compactionModel: summary.compactionModel ?? null,
    messageCount: summary.messageCount,
    lastUserMessage: summary.lastUserMessage,
    busy: summary.busy,
    lastMessageAt: summary.lastMessageAt,
    updatedAt: summary.updatedAt
  };
}
