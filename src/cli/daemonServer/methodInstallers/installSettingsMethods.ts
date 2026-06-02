import { AistDaemonServer } from '../AistDaemonServer';
import { getNumberSetting } from '../methods/getNumberSetting';
import { getOpenRouterApiKey } from '../methods/getOpenRouterApiKey';
import { getPrimaryActiveRun } from '../methods/getPrimaryActiveRun';
import { getProviderProfile } from '../methods/getProviderProfile';
import { getReasoningEffort } from '../methods/getReasoningEffort';
import { getRuntimeConfig } from '../methods/getRuntimeConfig';
import { getState } from '../methods/getState';
import { getStringArraySetting } from '../methods/getStringArraySetting';
import { getStringSetting } from '../methods/getStringSetting';
import { getToolPermissionsSetting } from '../methods/getToolPermissionsSetting';
import { handleClientResponse } from '../methods/handleClientResponse';
import { handleConnectionData } from '../methods/handleConnectionData';
import { handleConnectionLine } from '../methods/handleConnectionLine';
import { handleRuntimeEvent } from '../methods/handleRuntimeEvent';
import { hasAuxiliaryToolModelSettings } from '../methods/hasAuxiliaryToolModelSettings';
import { initializeMethod } from '../methods/initializeMethod';
import { initializeWorkspace } from '../methods/initializeWorkspace';
import { loadOpenRouterModels } from '../methods/loadOpenRouterModels';

/**
 * Что это: устанавливает группу settings-методов daemon на prototype.
 * Зачем нужно: общий installer остаётся маленьким, а JSON-RPC method names сохраняются.
 * Какую продуктовую проблему решает: daemon декомпозирован без изменения внешнего контракта.
 */
export function installSettingsMethods(): void {
  AistDaemonServer.prototype.getNumberSetting = getNumberSetting;
  AistDaemonServer.prototype.getOpenRouterApiKey = getOpenRouterApiKey;
  AistDaemonServer.prototype.getPrimaryActiveRun = getPrimaryActiveRun;
  AistDaemonServer.prototype.getProviderProfile = getProviderProfile;
  AistDaemonServer.prototype.getReasoningEffort = getReasoningEffort;
  AistDaemonServer.prototype.getRuntimeConfig = getRuntimeConfig;
  AistDaemonServer.prototype.getState = getState;
  AistDaemonServer.prototype.getStringArraySetting = getStringArraySetting;
  AistDaemonServer.prototype.getStringSetting = getStringSetting;
  AistDaemonServer.prototype.getToolPermissionsSetting = getToolPermissionsSetting;
  AistDaemonServer.prototype.handleClientResponse = handleClientResponse;
  AistDaemonServer.prototype.handleConnectionData = handleConnectionData;
  AistDaemonServer.prototype.handleConnectionLine = handleConnectionLine;
  AistDaemonServer.prototype.handleRuntimeEvent = handleRuntimeEvent;
  AistDaemonServer.prototype.hasAuxiliaryToolModelSettings = hasAuxiliaryToolModelSettings;
  AistDaemonServer.prototype.initializeMethod = initializeMethod;
  AistDaemonServer.prototype.initializeWorkspace = initializeWorkspace;
  AistDaemonServer.prototype.loadOpenRouterModels = loadOpenRouterModels;
}

declare module '../AistDaemonServer' {
  interface AistDaemonServer {
    getNumberSetting: typeof getNumberSetting;
    getOpenRouterApiKey: typeof getOpenRouterApiKey;
    getPrimaryActiveRun: typeof getPrimaryActiveRun;
    getProviderProfile: typeof getProviderProfile;
    getReasoningEffort: typeof getReasoningEffort;
    getRuntimeConfig: typeof getRuntimeConfig;
    getState: typeof getState;
    getStringArraySetting: typeof getStringArraySetting;
    getStringSetting: typeof getStringSetting;
    getToolPermissionsSetting: typeof getToolPermissionsSetting;
    handleClientResponse: typeof handleClientResponse;
    handleConnectionData: typeof handleConnectionData;
    handleConnectionLine: typeof handleConnectionLine;
    handleRuntimeEvent: typeof handleRuntimeEvent;
    hasAuxiliaryToolModelSettings: typeof hasAuxiliaryToolModelSettings;
    initializeMethod: typeof initializeMethod;
    initializeWorkspace: typeof initializeWorkspace;
    loadOpenRouterModels: typeof loadOpenRouterModels;
  }
}
