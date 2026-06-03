import type { AgentMemoryItem } from './AgentMemoryItem';

/**
 * Что это: считает суммарную длину текстов заметок памяти.
 * Зачем нужно: перед добавлением или заменой заметки быстро проверяется общий лимит памяти.
 * Какую продуктовую проблему решает: агент не раздувает память выше заданных 50000 символов.
 */
export function getMemoryTotalNoteChars(input: { items: AgentMemoryItem[] }): number {
  return input.items.reduce((total, item) => total + item.note.length, 0);
}
