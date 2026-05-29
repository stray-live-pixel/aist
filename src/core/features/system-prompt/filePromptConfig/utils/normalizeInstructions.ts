import type { FilePromptInstruction, FilePromptItemScope } from '../types';

/**
 * Что это: приводит сырые инструкции из settings.json к единому виду.
 * Зачем нужно: дальше prompt builder работает только с проверенными id, label и content.
 */
export function normalizeInstructions(params: { raw: unknown; scope: FilePromptItemScope }): FilePromptInstruction[] {
  if (!Array.isArray(params.raw)) return [];

  return params.raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string')
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      content: typeof item.content === 'string' ? item.content : '',
      scope: params.scope
    }));
}
