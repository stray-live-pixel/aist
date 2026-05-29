import type { FilePromptItemScope, FilePromptMode } from '../types';

/**
 * Что это: приводит роли агента из settings.json к безопасному формату.
 * Зачем нужно: активная роль добавляется в system prompt только если её можно однозначно найти.
 */
export function normalizeModes(params: { raw: unknown; scope: FilePromptItemScope }): FilePromptMode[] {
  if (!Array.isArray(params.raw)) return [];

  return params.raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string')
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      instructions: typeof item.instructions === 'string' ? item.instructions : '',
      scope: params.scope
    }));
}
