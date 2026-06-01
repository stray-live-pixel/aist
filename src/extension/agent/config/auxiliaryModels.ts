import type { ReasoningEffort } from '../../../core/shared/types/types';

export type AuxiliaryModelId = 'compaction' | 'tool' | 'memory';

export type AuxiliaryModelSettings = {
  model: string;
  reasoningEffort: ReasoningEffort;
  allowTools: boolean;
};

export type AuxiliaryToolModelOverride = AuxiliaryModelSettings & {
  toolName: string;
};

export type AuxiliaryToolModelSettings = AuxiliaryModelSettings & {
  overrides: AuxiliaryToolModelOverride[];
};

export type AuxiliaryModelsSettings = {
  compaction: AuxiliaryModelSettings;
  tool: AuxiliaryToolModelSettings;
  /** Настройки AI-субагента памяти; пустая model означает fallback на модель текущего чата. */
  memory: AuxiliaryModelSettings;
};

export const DEFAULT_AUXILIARY_MODEL_SETTINGS: AuxiliaryModelSettings = {
  model: '',
  reasoningEffort: 'auto',
  allowTools: false
};

export const DEFAULT_AUXILIARY_TOOL_MODEL_SETTINGS: AuxiliaryToolModelSettings = {
  ...DEFAULT_AUXILIARY_MODEL_SETTINGS,
  overrides: []
};

export const DEFAULT_AUXILIARY_MODELS_SETTINGS: AuxiliaryModelsSettings = {
  compaction: { ...DEFAULT_AUXILIARY_MODEL_SETTINGS },
  tool: { ...DEFAULT_AUXILIARY_TOOL_MODEL_SETTINGS },
  memory: { ...DEFAULT_AUXILIARY_MODEL_SETTINGS }
};

export function normalizeAuxiliaryModelSettings(value: unknown): AuxiliaryModelSettings {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    model: typeof record.model === 'string' ? record.model.trim() : DEFAULT_AUXILIARY_MODEL_SETTINGS.model,
    reasoningEffort: normalizeAuxiliaryReasoningEffort(record.reasoningEffort),
    allowTools: record.allowTools === true
  };
}

export function normalizeAuxiliaryToolModelSettings(value: unknown): AuxiliaryToolModelSettings {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    ...normalizeAuxiliaryModelSettings(record),
    overrides: normalizeAuxiliaryToolOverrides(record.overrides)
  };
}

export function normalizeAuxiliaryModelsSettings(value: unknown): AuxiliaryModelsSettings {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    compaction: normalizeAuxiliaryModelSettings(record.compaction),
    tool: normalizeAuxiliaryToolModelSettings(record.tool),
    memory: normalizeAuxiliaryModelSettings(record.memory)
  };
}

export function normalizeAuxiliaryReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh' ? value : 'auto';
}

function normalizeAuxiliaryToolOverrides(value: unknown): AuxiliaryToolModelOverride[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const overrides: AuxiliaryToolModelOverride[] = [];
  for (const item of value) {
    const record = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
    const toolName = typeof record.toolName === 'string' ? record.toolName.trim() : '';
    if (!toolName || seen.has(toolName)) {
      continue;
    }

    seen.add(toolName);
    overrides.push({
      toolName,
      ...normalizeAuxiliaryModelSettings(record)
    });
  }

  return overrides;
}
