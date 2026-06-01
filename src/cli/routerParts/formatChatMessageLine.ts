import { type ChatMessage } from '../../core/shared/types/types';
import { formatTimestamp } from './formatTimestamp';
import { toSingleLinePreview } from './toSingleLinePreview';

export function formatChatMessageLine(message: ChatMessage): string {
  const content = message.content ? ` ${toSingleLinePreview(message.content, 120)}` : '';
  return `[${formatTimestamp(message.createdAt)}] ${message.role}:${content}`;
}
