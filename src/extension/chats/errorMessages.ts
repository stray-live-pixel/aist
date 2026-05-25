import type { ChatMessage } from './types';

export const AIST_ERROR_MESSAGE_MARKER = 'aist:internal-error-message:v1';

export function createChatErrorMessage(content: string): Omit<ChatMessage, 'id' | 'createdAt'> {
  return {
    role: 'assistant',
    content,
    marker: AIST_ERROR_MESSAGE_MARKER
  };
}
