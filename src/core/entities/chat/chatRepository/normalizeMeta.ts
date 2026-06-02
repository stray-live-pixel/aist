import { assertRepositoryId, removeUndefined } from '../../../shared/lib/fileRepository';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import { DEFAULT_TITLE } from './DEFAULT_TITLE';
import type { StoredChatMeta } from './StoredChatMeta';
import { normalizeModelSettings } from './normalizeModelSettings';
import { normalizeTimestamp } from './normalizeTimestamp';
import { normalizeUsage } from './normalizeUsage';
import { normalizeVcsState } from './normalizeVcsState';

/**
 * Что это: нормализация persisted-метаданных чата.
 * Зачем нужно: чтение meta.json должно исправлять старые default-поля и отбрасывать undefined.
 * Какую продуктовую проблему решает: повреждённая карточка не блокирует доступ к сообщениям пользователя.
 */
export function normalizeMeta({ meta }: { meta: StoredChatMeta }): StoredChatMeta {
  return removeUndefined({
    schemaVersion: CHAT_SCHEMA_VERSION,
    id: assertRepositoryId(meta.id, 'chat'),
    title: typeof meta.title === 'string' && meta.title.trim() ? meta.title : DEFAULT_TITLE,
    model: typeof meta.model === 'string' && meta.model.trim() ? meta.model : 'unknown',
    modelSettings: normalizeModelSettings({ value: meta.modelSettings, fallbackModel: meta.model }),
    previousChatId: meta.previousChatId,
    compactedAt: meta.compactedAt,
    compactionModel:
      typeof meta.compactionModel === 'string' && meta.compactionModel.trim() ? meta.compactionModel.trim() : undefined,
    vcs: normalizeVcsState({ value: meta.vcs }),
    lastAnswer: typeof meta.lastAnswer === 'string' ? meta.lastAnswer : '',
    usage: normalizeUsage({ usage: meta.usage }),
    createdAt: normalizeTimestamp({ value: meta.createdAt }),
    updatedAt: normalizeTimestamp({ value: meta.updatedAt || meta.createdAt })
  });
}
