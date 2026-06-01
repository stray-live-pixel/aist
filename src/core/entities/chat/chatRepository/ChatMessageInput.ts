import type { ChatMessage } from '../../../shared/types/types';

/**
 * Что это: входные данные для записи сообщения в чат.
 * Зачем нужно: runtime может передать готовый id/time, а обычный сценарий получит их от репозитория.
 * Какую продуктовую проблему решает: история чата стабильно восстанавливается после перезапуска.
 */
export type ChatMessageInput = Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>;
