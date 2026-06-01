import type { Chat } from '../../../shared/types/types';

/**
 * Что это: безопасный patch persisted-метаданных чата.
 * Зачем нужно: отдельные сценарии обновляют только свою часть карточки чата.
 * Какую продуктовую проблему решает: модель, заголовок, usage и VCS-данные не перетираются случайно.
 */
export type ChatMetadataPatch = Partial<
  Pick<
    Chat,
    | 'title'
    | 'model'
    | 'modelSettings'
    | 'previousChatId'
    | 'compactedAt'
    | 'compactionModel'
    | 'vcs'
    | 'lastAnswer'
    | 'usage'
  >
>;
