import { sortByUpdatedAtDesc } from '../../../shared/lib/fileRepository';
import type { ChatSummary } from '../../../shared/types/types';

/**
 * Что это: сортировка summaries по актуальности.
 * Зачем нужно: индекс и fallback rebuild должны возвращать один и тот же порядок.
 * Какую продуктовую проблему решает: список чатов не прыгает между refresh и rebuild index.
 */
export function sortSummaries({ summaries }: { summaries: ChatSummary[] }): ChatSummary[] {
  return sortByUpdatedAtDesc(summaries.map((summary) => ({ ...summary, createdAt: summary.lastMessageAt })));
}
