import type { FilePromptItemRef } from '../types';
import { normalizeItemRef } from './normalizeItemRef';

/**
 * Что это: нормализует список ссылок на инструкции или роли.
 * Зачем нужно: одна сломанная ссылка в settings.json не должна ломать весь preset.
 */
export function normalizeItemRefs(params: { raw: unknown }): FilePromptItemRef[] {
  if (!Array.isArray(params.raw)) return [];

  return params.raw
    .map((item) => normalizeItemRef({ raw: item }))
    .filter((item): item is FilePromptItemRef => Boolean(item));
}
