import type { FilePromptItemScope, FilePromptPreset } from '../types';
import { normalizeItemRef } from './normalizeItemRef';
import { normalizeItemRefs } from './normalizeItemRefs';

/**
 * Что это: приводит пресеты из settings.json к единому и безопасному формату.
 * Зачем нужно: daemon должен применять ровно те instructionRefs и modeRef, которые пользователь выбрал в UI.
 */
export function normalizePresets(params: { raw: unknown; fallbackScope: FilePromptItemScope }): FilePromptPreset[] {
  if (!Array.isArray(params.raw)) return [];

  const usedIds = new Set<string>();
  const presets: FilePromptPreset[] = [];
  for (const item of params.raw) {
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const label = typeof record.label === 'string' ? record.label : '';
    if (!id || !label || usedIds.has(id)) continue;

    // Scope из файла важнее fallback, потому что глобальные пресеты могут быть
    // скопированы в workspace settings и всё равно должны отображаться корректно.
    usedIds.add(id);
    presets.push({
      id,
      label,
      instructionRefs: normalizeItemRefs({ raw: record.instructionRefs }),
      modeRef: normalizeItemRef({ raw: record.modeRef }),
      scope: record.scope === 'global' || record.scope === 'local' ? record.scope : params.fallbackScope
    });
  }

  return presets;
}
