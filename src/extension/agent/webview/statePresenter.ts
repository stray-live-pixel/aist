import { getTelemetryDashboardState } from '../../../core/features/telemetry/telemetry';
import type { OpenRouterModelOption } from '../../../core/shared/types/types';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { AistLogger } from '../../shared/logger';
import { getWorkspaceName } from '../../shared/workspace';
import { getAgentSkills } from '../../skills/skills';
import {
  getActiveToolPermissionPresetId,
  getToolPermissionItems,
  getToolPermissionPresets
} from '../../tools/permissions';
import { getAgentConfigScope, getProjectInstructions, getPromptConfig } from '../config/agentConfigStore';
import { getAuxiliaryModelsSettings } from '../config/auxiliaryModelSettings';
import { getCompactionSettings } from '../config/compaction';
import { getComposerUiSettings } from '../config/composerUi';
import { getApprovalNotificationSettings } from '../config/notifications';
import { getProviderProfiles } from '../config/providerProfiles';
import { getActiveAgentMode, getAgentLanguage, getAgentModes } from '../config/settings';
import { getAgentSettingsSnapshot, getDefaultModelSettings } from '../config/settingsSnapshot';
import { getAgentInstructionSources } from '../config/systemPrompt';
import { getDaemonToolCatalog, getDaemonTools } from '../daemon/toolCatalog';
import { getAgentMemoryItems } from '../memory/memory';
import { mergeModels } from '../models/models';
import type { WebviewSurface } from '../types';
import { mapChatToWebviewActiveChat } from './stateMapping';

export type SendAgentStateParams = {
  /** Версия берётся из ExtensionContext.packageJSON: это установленный VSIX, а не исходный package.json в workspace. */
  extensionVersion: string;
  surfaces: WebviewSurface[];
  chats: AgentChatStore;
  logger: AistLogger;
  modelOptions: OpenRouterModelOption[];
  codexAuthenticated: boolean;
  getSystemPrompt(): string;
};

/**
 * Собирает и отправляет состояние расширения во все webview-поверхности.
 *
 * Presenter отделен от AgentController, потому что state message объединяет
 * данные чатов, настроек, моделей, permissions и skills. Контроллер передает
 * только текущее состояние, а модуль отвечает за форму сообщения для UI.
 */
export function sendAgentState(params: SendAgentStateParams): void {
  if (!params.surfaces.length) {
    params.logger.info('sendState skipped: no webview surfaces are registered');
    return;
  }

  const { configuredModel, maxToolIterations, reasoningEffort, codexServiceTier, editorContextMode, streamingEnabled } =
    getAgentSettingsSnapshot();
  const defaultModelSettings = getDefaultModelSettings();
  const language = getAgentLanguage();
  const activeMode = getActiveAgentMode();
  const agentModes = getAgentModes();
  const customSkills = getAgentSkills();
  const tools = getDaemonTools(customSkills);
  const agentConfigScope = getAgentConfigScope();
  const projectInstructions = getProjectInstructions();
  const instructionSources = getAgentInstructionSources();
  const promptConfig = getPromptConfig();
  const memoryItems = getAgentMemoryItems();
  const compactionSettings = getCompactionSettings();
  const auxiliaryModels = getAuxiliaryModelsSettings();
  const approvalNotificationSettings = getApprovalNotificationSettings();
  const composerUiSettings = getComposerUiSettings();
  const projectToolDiagnostics = getDaemonToolCatalog().snapshot().diagnostics;
  const telemetry = getTelemetryDashboardState();
  const providerProfiles = getProviderProfiles();

  for (const surface of params.surfaces) {
    postStateToSurface(surface, {
      ...params,
      configuredModel,
      defaultModelSettings,
      maxToolIterations,
      reasoningEffort,
      codexServiceTier,
      editorContextMode,
      streamingEnabled,
      language,
      activeMode,
      agentModes,
      customSkills,
      tools,
      agentConfigScope,
      projectInstructions,
      promptConfig,
      memoryItems,
      instructionSources,
      auxiliaryModels,
      compactionSettings,
      approvalNotificationSettings,
      composerUiSettings,
      telemetry,
      projectToolDiagnostics,
      providerProfiles
    });
  }
}

type StateContext = SendAgentStateParams & {
  configuredModel: string;
  defaultModelSettings: ReturnType<typeof getDefaultModelSettings>;
  maxToolIterations: number;
  reasoningEffort: string;
  codexServiceTier: string;
  editorContextMode: string;
  streamingEnabled: boolean;
  language: string;
  activeMode: { id: string };
  agentModes: unknown;
  customSkills: unknown;
  tools: ReturnType<typeof getDaemonTools>;
  agentConfigScope: string;
  projectInstructions: string;
  promptConfig: unknown;
  memoryItems: unknown;
  instructionSources: unknown;
  auxiliaryModels: unknown;
  compactionSettings: unknown;
  approvalNotificationSettings: unknown;
  composerUiSettings: unknown;
  telemetry: unknown;
  projectToolDiagnostics: unknown;
  providerProfiles: unknown;
};

function postStateToSurface(surface: WebviewSurface, context: StateContext): void {
  const activeChat = context.chats.getChat(surface.getChatId()) || context.chats.getActiveChat();
  const models = mergeModels(context.modelOptions, context.configuredModel, activeChat.model);
  const activeModel = models.find((model) => model.id === activeChat.model);
  const previousChat = activeChat.previousChatId ? context.chats.getChat(activeChat.previousChatId) : undefined;
  const webviewActiveChat = mapChatToWebviewActiveChat({
    chat: activeChat,
    previousChat,
    systemPrompt: context.getSystemPrompt(),
    activeModel
  });

  const stateMessage = {
    type: 'state',
    viewKind: surface.kind,
    extensionVersion: context.extensionVersion,
    workspaceName: getWorkspaceName(),
    tools: context.tools.map((tool) => tool.function.name),
    chats: context.chats.getSummaries(),
    activeChat: webviewActiveChat,
    models,
    providerProfiles: context.providerProfiles,
    defaultModelSettings: context.defaultModelSettings,
    maxToolIterations: context.maxToolIterations,
    reasoningEffort: context.reasoningEffort,
    codexServiceTier: context.codexServiceTier,
    editorContextMode: context.editorContextMode,
    streamingEnabled: context.streamingEnabled,
    auxiliaryModels: context.auxiliaryModels,
    compactionSettings: context.compactionSettings,
    approvalNotificationSettings: context.approvalNotificationSettings,
    composerUiSettings: context.composerUiSettings,
    telemetry: context.telemetry,
    projectToolDiagnostics: context.projectToolDiagnostics,
    agentLanguage: context.language,
    agentMode: context.activeMode.id,
    agentModes: context.agentModes,
    agentConfigScope: context.agentConfigScope,
    projectInstructions: context.projectInstructions,
    promptConfig: context.promptConfig,
    memoryItems: context.memoryItems,
    instructionSources: context.instructionSources,
    customSkills: context.customSkills,
    codexAuthenticated: context.codexAuthenticated,
    toolPermissions: getToolPermissionItems(),
    toolPermissionPresets: getToolPermissionPresets(),
    activeToolPermissionPresetId: getActiveToolPermissionPresetId()
  } as const;

  void surface.webview.postMessage(stateMessage).then(
    (delivered) => {
      context.logger.info('State posted to webview', {
        surfaceId: surface.id,
        kind: surface.kind,
        chatId: activeChat.id,
        chatCount: stateMessage.chats.length,
        messageCount: webviewActiveChat.messages.length,
        delivered
      });
    },
    (error) => {
      context.logger.error('Failed to post state to webview', error);
    }
  );
}
