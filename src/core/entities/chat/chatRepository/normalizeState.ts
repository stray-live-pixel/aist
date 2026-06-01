import { removeUndefined } from '../../../shared/lib/fileRepository';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatStatePatch } from './ChatStatePatch';
import type { StoredChatState } from './StoredChatState';

/**
 * Что это: нормализация transient-состояния чата.
 * Зачем нужно: state.json может отсутствовать или содержать только часть runtime-полей.
 * Какую продуктовую проблему решает: UI всегда получает корректный busy/status без падения на старых чатах.
 */
export function normalizeState({
  state
}: {
  state: Partial<StoredChatState> | ChatStatePatch | undefined;
}): StoredChatState {
  return removeUndefined({
    schemaVersion: CHAT_SCHEMA_VERSION,
    busy: Boolean(state?.busy),
    activity: state?.activity,
    activityDetail: state?.activityDetail,
    modelRequest: state?.modelRequest,
    context: state?.context,
    contextLength: state?.contextLength,
    activePlan: state?.activePlan,
    reflectionCandidates: state?.reflectionCandidates
  });
}
