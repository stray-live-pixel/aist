import { readAgentConfig, updateAgentConfig } from './agentConfigStore';
import type {
  AuxiliaryModelId,
  AuxiliaryModelSettings,
  AuxiliaryModelsSettings,
  AuxiliaryToolModelOverride,
  AuxiliaryToolModelSettings
} from './auxiliaryModels';
import {
  normalizeAuxiliaryModelSettings,
  normalizeAuxiliaryModelsSettings,
  normalizeAuxiliaryToolModelSettings
} from './auxiliaryModels';

export function getAuxiliaryModelsSettings(): AuxiliaryModelsSettings {
  return normalizeAuxiliaryModelsSettings(readAgentConfig().auxiliaryModels);
}

export function getAuxiliaryModelSettings(id: 'compaction'): AuxiliaryModelSettings;
export function getAuxiliaryModelSettings(id: 'tool'): AuxiliaryToolModelSettings;
export function getAuxiliaryModelSettings(id: AuxiliaryModelId): AuxiliaryModelSettings | AuxiliaryToolModelSettings {
  return getAuxiliaryModelsSettings()[id];
}

export async function setAuxiliaryModelSettings(
  id: AuxiliaryModelId,
  settings: Partial<AuxiliaryModelSettings>
): Promise<void> {
  const current = getAuxiliaryModelsSettings();
  const nextValue =
    id === 'tool'
      ? normalizeAuxiliaryToolModelSettings({ ...current.tool, ...settings })
      : normalizeAuxiliaryModelSettings({ ...current.compaction, ...settings });
  await updateAgentConfig({
    auxiliaryModels: {
      ...current,
      [id]: nextValue
    }
  });
}

export async function setAuxiliaryToolModelOverrides(overrides: AuxiliaryToolModelOverride[]): Promise<void> {
  const current = getAuxiliaryModelsSettings();
  await updateAgentConfig({
    auxiliaryModels: {
      ...current,
      tool: normalizeAuxiliaryToolModelSettings({ ...current.tool, overrides })
    }
  });
}
