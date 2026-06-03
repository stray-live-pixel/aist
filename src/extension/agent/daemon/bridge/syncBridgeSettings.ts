import * as vscode from 'vscode';

import { getAuxiliaryModelsSettings } from '../../config/auxiliaryModelSettings';
import { getMemorySettings } from '../../config/memory';
import { getProviderProfiles } from '../../config/providerProfiles';
import { getAgentLanguage } from '../../config/settings';
import { getAgentSettingsSnapshot } from '../../config/settingsSnapshot';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { updateBridgeDaemonConfig } from './updateBridgeDaemonConfig';

/**
 * Что это: синхронизирует настройки VS Code extension в daemon config.
 * Зачем нужно: перед chat.ask/create daemon должен знать актуальные model, tools, language и provider profiles.
 * Какую продуктовую проблему решает: пользовательские настройки применяются к следующему ответу без ручной перезагрузки.
 */
export async function syncBridgeSettings({ context }: { context: BridgeRuntimeContext }): Promise<void> {
  const snapshot = getAgentSettingsSnapshot();
  const payload = {
    model: snapshot.configuredModel,
    maxToolIterations: snapshot.maxToolIterations,
    reasoningEffort: snapshot.reasoningEffort,
    codexServiceTier: snapshot.codexServiceTier,
    streamingEnabled: snapshot.streamingEnabled,
    toolCallNotesRequired: snapshot.toolCallNotesRequired,
    providerProfiles: getProviderProfiles(),
    auxiliaryModels: getAuxiliaryModelsSettings(),
    memory: getMemorySettings(),
    language: getAgentLanguage(),
    toolPermissions:
      vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('toolPermissions') || {},
    projectToolDisabledIds:
      vscode.workspace.getConfiguration('openrouterAgent').get<readonly string[]>('projectToolDisabledIds') || []
  };
  const serialized = JSON.stringify(payload);
  if (serialized === context.state.lastSyncedSettings) {
    return;
  }

  for (const [key, value] of Object.entries(payload)) {
    await updateBridgeDaemonConfig({ context, key, value });
  }
  context.state.lastSyncedSettings = serialized;
}
