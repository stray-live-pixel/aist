import { globalSettingsFile, workspaceSettingsFile } from '../../../../entities/storage/storage';
import type { FilePromptConfig } from '../types';
import { normalizeExistingInstructionRefs } from '../utils/normalizeExistingInstructionRefs';
import { normalizeExistingModeRef } from '../utils/normalizeExistingModeRef';
import { normalizeInstructions } from '../utils/normalizeInstructions';
import { normalizeModes } from '../utils/normalizeModes';
import { normalizePresets } from '../utils/normalizePresets';
import { readStoredAgentConfig } from '../utils/readStoredAgentConfig';

/**
 * Что это: собирает активную prompt-конфигурацию из глобального и проектного settings.json.
 * Зачем нужно: daemon должен применять тот же preset, инструкции и роль, которые пользователь выбрал в UI.
 */
export function getFilePromptConfig(params: { workspaceRoot: string; homeDir?: string }): FilePromptConfig {
  const globalConfig = readStoredAgentConfig({ filePath: globalSettingsFile(params.homeDir) });
  const localConfig = readStoredAgentConfig({ filePath: workspaceSettingsFile(params.workspaceRoot) });
  const globalInstructions = normalizeInstructions({ raw: globalConfig.instructions, scope: 'global' });
  const localInstructions = normalizeInstructions({ raw: localConfig.instructions, scope: 'local' });
  const globalModes = normalizeModes({ raw: globalConfig.modes, scope: 'global' });
  const localModes = normalizeModes({ raw: localConfig.modes, scope: 'local' });
  const presets = [
    ...normalizePresets({ raw: globalConfig.presets, fallbackScope: 'global' }),
    ...normalizePresets({ raw: localConfig.presets, fallbackScope: 'local' })
  ];
  const fallbackPreset = presets[0];

  return {
    globalInstructions,
    localInstructions,
    globalModes,
    localModes,
    presets,
    activeInstructionRefs: normalizeExistingInstructionRefs({
      raw: localConfig.activeInstructionRefs || fallbackPreset?.instructionRefs || [],
      instructions: [...globalInstructions, ...localInstructions]
    }),
    activeModeRef: normalizeExistingModeRef({
      raw: localConfig.activeModeRef || fallbackPreset?.modeRef,
      modes: [...globalModes, ...localModes]
    }),
    activePresetId: typeof localConfig.activePresetId === 'string' ? localConfig.activePresetId : fallbackPreset?.id
  };
}
