import { assertRepositoryId, removeUndefined } from '../../../shared/lib/fileRepository';
import { RUN_SCHEMA_VERSION } from './constants';
import { normalizeRunStatus } from './normalizeRunStatus';
import { normalizeRunTimestamp } from './normalizeRunTimestamp';
import { normalizeRunUsage } from './normalizeRunUsage';
import type { RunMetadata } from './types';

/**
 * Что это: нормализует meta.json запуска перед чтением или записью.
 * Зачем нужно: файловое хранилище может содержать данные старого формата или ручные правки.
 * Какую проблему решает: runtime всегда получает валидный id, статус, timestamps и usage.
 */
export function normalizeRunMeta({ meta }: { meta: RunMetadata }): RunMetadata {
  return removeUndefined({
    schemaVersion: RUN_SCHEMA_VERSION,
    id: assertRepositoryId(meta.id, 'run'),
    chatId: assertRepositoryId(meta.chatId, 'chat'),
    status: normalizeRunStatus({ status: meta.status }),
    prompt: meta.prompt,
    model: meta.model,
    startedAt: normalizeRunTimestamp({ value: meta.startedAt }),
    finishedAt: meta.finishedAt,
    updatedAt: normalizeRunTimestamp({ value: meta.updatedAt || meta.startedAt }),
    usage: meta.usage ? normalizeRunUsage({ usage: meta.usage }) : undefined,
    error: meta.error
  });
}
