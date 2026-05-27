import type { ChatStore } from '../../chats/chatStore';
import type { OpenRouterModelOption } from '../../openrouter/types';
import type { AistLogger } from '../../shared/logger';
import { getWorkspaceName } from '../../shared/workspace';
import { getAgentSkills } from '../../skills/skills';
import {
  getActiveToolPermissionPresetId,
  getToolPermissionItems,
  getToolPermissionPresets
} from '../../tools/permissions';
import { getAgentConfigScope, getProjectInstructions, getPromptConfig } from '../config/agentConfigStore';
import { getCompactionSettings } from '../config/compaction';
import { getApprovalNotificationSettings } from '../config/notifications';
import { getActiveAgentMode, getAgentLanguage, getAgentModes } from '../config/settings';
import { getAgentSettingsSnapshot } from '../config/settingsSnapshot';
import { getAgentInstructionSources } from '../config/systemPrompt';
import { mergeModels } from '../models/models';
import { getAgentTools } from '../runtime/tools';
import { createEmptyUsage, getChatContextEstimate } from '../runtime/usage';
import type { WebviewSurface } from '../types';

export type SendAgentStateParams = {
  /** Версия берётся из ExtensionContext.packageJSON: это установленный VSIX, а не исходный package.json в workspace. */
  extensionVersion: string;
  surfaces: WebviewSurface[];
  chats: ChatStore;
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

  const { configuredModel, maxToolIterations, reasoningEffort, streamingEnabled } = getAgentSettingsSnapshot();
  const language = getAgentLanguage();
  const activeMode = getActiveAgentMode();
  const agentModes = getAgentModes();
  const customSkills = getAgentSkills();
  const tools = getAgentTools(customSkills);
  const agentConfigScope = getAgentConfigScope();
  const projectInstructions = getProjectInstructions();
  const instructionSources = getAgentInstructionSources();
  const promptConfig = getPromptConfig();
  const compactionSettings = getCompactionSettings();
  const approvalNotificationSettings = getApprovalNotificationSettings();

  for (const surface of params.surfaces) {
    postStateToSurface(surface, {
      ...params,
      configuredModel,
      maxToolIterations,
      reasoningEffort,
      streamingEnabled,
      language,
      activeMode,
      agentModes,
      customSkills,
      tools,
      agentConfigScope,
      projectInstructions,
      promptConfig,
      instructionSources,
      compactionSettings,
      approvalNotificationSettings
    });
  }
}

type StateContext = SendAgentStateParams & {
  configuredModel: string;
  maxToolIterations: number;
  reasoningEffort: string;
  streamingEnabled: boolean;
  language: string;
  activeMode: { id: string };
  agentModes: unknown;
  customSkills: unknown;
  tools: ReturnType<typeof getAgentTools>;
  agentConfigScope: string;
  projectInstructions: string;
  promptConfig: unknown;
  instructionSources: unknown;
  compactionSettings: unknown;
  approvalNotificationSettings: unknown;
};

function omitHistory<T extends { history?: unknown }>(chat: T): Omit<T, 'history'> {
  const { history: _history, ...rest } = chat;
  return rest;
}

function postStateToSurface(surface: WebviewSurface, context: StateContext): void {
  const activeChat = context.chats.getChat(surface.getChatId()) || context.chats.getActiveChat();
  const models = mergeModels(context.modelOptions, context.configuredModel, activeChat.model);
  const activeModel = models.find((model) => model.id === activeChat.model);
  const chatContext =
    activeChat.context ||
    getChatContextEstimate(activeChat.history, context.getSystemPrompt(), activeModel, activeChat.usage);
  const previousChat = activeChat.previousChatId ? context.chats.getChat(activeChat.previousChatId) : undefined;
  const { history: _history, ...webviewChat } = activeChat;
  const webviewActiveChat = {
    ...webviewChat,
    previousChat: previousChat ? omitHistory(previousChat) : undefined,
    context: chatContext,
    contextLength: chatContext.tokens,
    usage: activeChat.usage || createEmptyUsage()
  };

  const stateMessage = {
    type: 'state',
    viewKind: surface.kind,
    extensionVersion: context.extensionVersion,
    workspaceName: getWorkspaceName(),
    tools: context.tools.map((tool) => tool.function.name),
    chats: context.chats.getSummaries(),
    activeChat: webviewActiveChat,
    models,
    maxToolIterations: context.maxToolIterations,
    reasoningEffort: context.reasoningEffort,
    streamingEnabled: context.streamingEnabled,
    compactionSettings: context.compactionSettings,
    approvalNotificationSettings: context.approvalNotificationSettings,
    agentLanguage: context.language,
    agentMode: context.activeMode.id,
    agentModes: context.agentModes,
    agentConfigScope: context.agentConfigScope,
    projectInstructions: context.projectInstructions,
    promptConfig: context.promptConfig,
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
