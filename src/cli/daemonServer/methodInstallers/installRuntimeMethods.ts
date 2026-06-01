import { AistDaemonServer } from '../AistDaemonServer';
import { eventsSubscribe } from '../methods/eventsSubscribe';
import { getActiveRuns } from '../methods/getActiveRuns';
import { getAuxiliaryBooleanSetting } from '../methods/getAuxiliaryBooleanSetting';
import { getAuxiliaryModelSetting } from '../methods/getAuxiliaryModelSetting';
import { getAuxiliaryReasoningEffort } from '../methods/getAuxiliaryReasoningEffort';
import { getAuxiliaryToolOverride } from '../methods/getAuxiliaryToolOverride';
import { getAuxiliaryToolOverrides } from '../methods/getAuxiliaryToolOverrides';
import { getAuxiliaryToolSettings } from '../methods/getAuxiliaryToolSettings';
import { getBooleanSetting } from '../methods/getBooleanSetting';
import { getClientEditorContext } from '../methods/getClientEditorContext';
import { getCodexServiceTier } from '../methods/getCodexServiceTier';
import { getConfiguredSkills } from '../methods/getConfiguredSkills';
import { getDaemonToolPermission } from '../methods/getDaemonToolPermission';
import { getDefaultChatModelSettings } from '../methods/getDefaultChatModelSettings';
import { getEditorContextMode } from '../methods/getEditorContextMode';
import { getFirstConfigSetting } from '../methods/getFirstConfigSetting';
import { getLanguage } from '../methods/getLanguage';
import { getMemorySubagentSettings } from '../methods/getMemorySubagentSettings';

/**
 * Что это: устанавливает группу runtime-методов daemon на prototype.
 * Зачем нужно: общий installer остаётся маленьким, а JSON-RPC method names сохраняются.
 * Какую продуктовую проблему решает: daemon декомпозирован без изменения внешнего контракта.
 */
export function installRuntimeMethods(): void {
  AistDaemonServer.prototype.eventsSubscribe = eventsSubscribe;
  AistDaemonServer.prototype.getActiveRuns = getActiveRuns;
  AistDaemonServer.prototype.getAuxiliaryBooleanSetting = getAuxiliaryBooleanSetting;
  AistDaemonServer.prototype.getAuxiliaryModelSetting = getAuxiliaryModelSetting;
  AistDaemonServer.prototype.getAuxiliaryReasoningEffort = getAuxiliaryReasoningEffort;
  AistDaemonServer.prototype.getAuxiliaryToolOverride = getAuxiliaryToolOverride;
  AistDaemonServer.prototype.getAuxiliaryToolOverrides = getAuxiliaryToolOverrides;
  AistDaemonServer.prototype.getAuxiliaryToolSettings = getAuxiliaryToolSettings;
  AistDaemonServer.prototype.getBooleanSetting = getBooleanSetting;
  AistDaemonServer.prototype.getClientEditorContext = getClientEditorContext;
  AistDaemonServer.prototype.getCodexServiceTier = getCodexServiceTier;
  AistDaemonServer.prototype.getConfiguredSkills = getConfiguredSkills;
  AistDaemonServer.prototype.getDaemonToolPermission = getDaemonToolPermission;
  AistDaemonServer.prototype.getDefaultChatModelSettings = getDefaultChatModelSettings;
  AistDaemonServer.prototype.getEditorContextMode = getEditorContextMode;
  AistDaemonServer.prototype.getFirstConfigSetting = getFirstConfigSetting;
  AistDaemonServer.prototype.getLanguage = getLanguage;
  AistDaemonServer.prototype.getMemorySubagentSettings = getMemorySubagentSettings;
}

declare module '../AistDaemonServer' {
  interface AistDaemonServer {
    eventsSubscribe: typeof eventsSubscribe;
    getActiveRuns: typeof getActiveRuns;
    getAuxiliaryBooleanSetting: typeof getAuxiliaryBooleanSetting;
    getAuxiliaryModelSetting: typeof getAuxiliaryModelSetting;
    getAuxiliaryReasoningEffort: typeof getAuxiliaryReasoningEffort;
    getAuxiliaryToolOverride: typeof getAuxiliaryToolOverride;
    getAuxiliaryToolOverrides: typeof getAuxiliaryToolOverrides;
    getAuxiliaryToolSettings: typeof getAuxiliaryToolSettings;
    getBooleanSetting: typeof getBooleanSetting;
    getClientEditorContext: typeof getClientEditorContext;
    getCodexServiceTier: typeof getCodexServiceTier;
    getConfiguredSkills: typeof getConfiguredSkills;
    getDaemonToolPermission: typeof getDaemonToolPermission;
    getDefaultChatModelSettings: typeof getDefaultChatModelSettings;
    getEditorContextMode: typeof getEditorContextMode;
    getFirstConfigSetting: typeof getFirstConfigSetting;
    getLanguage: typeof getLanguage;
    getMemorySubagentSettings: typeof getMemorySubagentSettings;
  }
}
