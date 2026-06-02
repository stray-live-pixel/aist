import type { Chat } from '../../../shared/types/types';

/**
 * Что это: patch transient-состояния чата.
 * Зачем нужно: runtime обновляет busy/activity/context/plan отдельно от постоянной истории.
 * Какую продуктовую проблему решает: UI видит актуальный прогресс агента без смешивания с сообщениями пользователя.
 */
export type ChatStatePatch = Partial<
  Pick<
    Chat,
    | 'busy'
    | 'activity'
    | 'activityDetail'
    | 'modelRequest'
    | 'context'
    | 'contextLength'
    | 'activePlan'
    | 'reflectionCandidates'
  >
>;
