import type { FilePromptItemRef } from '../types';

/**
 * Что это: превращает сырую JSON-ссылку в безопасную ссылку на prompt-элемент.
 * Зачем нужно: пользователь может вручную править settings.json, поэтому агент
 * принимает только ссылки с понятными `scope` и `id`.
 */
export function normalizeItemRef(params: { raw: unknown }): FilePromptItemRef | undefined {
  if (!params.raw || typeof params.raw !== 'object') return undefined;

  const record = params.raw as Record<string, unknown>;
  const scope = record.scope === 'global' ? 'global' : record.scope === 'local' ? 'local' : undefined;
  const id = typeof record.id === 'string' ? record.id : undefined;

  return scope && id ? { scope, id } : undefined;
}
