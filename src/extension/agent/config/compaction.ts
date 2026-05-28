import { readAgentConfig, updateAgentConfig } from './agentConfigStore';
import type { AuxiliaryModelSettings } from './auxiliaryModels';
import { normalizeAuxiliaryModelSettings } from './auxiliaryModels';

export type CompactionSettings = {
  enabled: boolean;
  thresholdPercent: number;
  keepLastMessages: number;
  model: string;
  reasoningEffort: AuxiliaryModelSettings['reasoningEffort'];
  allowTools: boolean;
};

const DEFAULT_COMPACTION_SETTINGS: CompactionSettings = {
  enabled: true,
  thresholdPercent: 70,
  keepLastMessages: 0,
  model: '',
  reasoningEffort: 'auto',
  allowTools: false
};

export function getCompactionSettings(): CompactionSettings {
  const raw = readAgentConfig().compaction;
  const model = normalizeAuxiliaryModelSettings(raw);
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_COMPACTION_SETTINGS.enabled,
    thresholdPercent: clampNumber(raw?.thresholdPercent, DEFAULT_COMPACTION_SETTINGS.thresholdPercent, 10, 95),
    keepLastMessages: clampNumber(raw?.keepLastMessages, DEFAULT_COMPACTION_SETTINGS.keepLastMessages, 0, 20),
    model: model.model,
    reasoningEffort: model.reasoningEffort,
    allowTools: model.allowTools
  };
}

export async function setCompactionSettings(settings: Partial<CompactionSettings>): Promise<void> {
  await updateAgentConfig({ compaction: { ...getCompactionSettings(), ...settings } });
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}
