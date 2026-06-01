import type { MemorySelectionInput } from '../types';
import { formatChatHistoryForMemory } from '../utils/formatChatHistoryForMemory';
import { formatMemoryItemsForSubagent } from '../utils/formatMemoryItemsForSubagent';

/**
 * Что это: собирает задание для субагента подбора памяти.
 * Зачем нужно: модель должна понять текущую задачу, историю и выбрать только реально полезные заметки.
 */
export function buildMemorySelectionPrompt(input: MemorySelectionInput): string {
  return [
    'Ты субагент памяти AIST. Твоя задача — выбрать короткие заметки памяти, которые реально помогут текущей сессии.',
    '',
    'Правила:',
    '- Выбирай только заметки, которые подходят к новому сообщению пользователя и текущей истории.',
    '- Не выбирай заметку просто потому, что в ней совпало одно слово.',
    '- Не выбирай заметки, которые противоречат явной просьбе пользователя.',
    '- Верни максимум 6 заметок.',
    '- Верни строгий JSON без markdown.',
    '',
    'Формат ответа:',
    JSON.stringify({ selectedIds: ['memory-id'], reason: 'коротко почему эти заметки нужны' }, null, 2),
    '',
    'Новое сообщение пользователя:',
    input.prompt,
    '',
    'Короткая история чата:',
    formatChatHistoryForMemory({ messages: input.chatHistory }),
    '',
    'Доступные заметки памяти:',
    formatMemoryItemsForSubagent({ items: input.memoryItems })
  ].join('\n');
}
