import type { FilePromptItemRef, FilePromptMode } from '../types';
import { normalizeItemRef } from './normalizeItemRef';

/**
 * Что это: проверяет, что активная ссылка на роль ведёт к существующей роли.
 * Зачем нужно: system prompt не должен содержать роль, которую уже удалили из настроек.
 */
export function normalizeExistingModeRef(params: {
  raw: unknown;
  modes: FilePromptMode[];
}): FilePromptItemRef | undefined {
  const ref = normalizeItemRef({ raw: params.raw });
  if (!ref) return undefined;

  return params.modes.some((item) => item.scope === ref.scope && item.id === ref.id) ? ref : undefined;
}
