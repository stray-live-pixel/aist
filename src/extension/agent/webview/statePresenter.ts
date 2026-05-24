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
import { getAgentConfigScope, getProjectInstructions } from '../config/agentConfigStore';
import { getCompactionSettings } from '../config/compaction';
import { getActiveAgentMode, getAgentLanguage, getAgentModes } from '../config/settings';
import { getAgentSettingsSnapshot } from '../config/settingsSnapshot';
import { getAgentInstructionSources } from '../config/systemPrompt';
import { mergeModels } from '../models/models';
import { getAgentTools } from '../runtime/tools';
import { createEmptyUsage, getChatContextEstimate } from '../runtime/usage';
import type { WebviewSurface } from '../types';

export type SendAgentStateParams = {
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

  const { configuredModel, maxToolIterations, reasoningEffort } = getAgentSettingsSnapshot();
  const language = getAgentLanguage();
  const activeMode = getActiveAgentMode();
  const agentModes = getAgentModes();
  const customSkills = getAgentSkills();
  const tools = getAgentTools(customSkills);
  const agentConfigScope = getAgentConfigScope();
  const projectInstructions = getProjectInstructions();
  const instructionSources = getAgentInstructionSources();
  const compactionSettings = getCompactionSettings();

  for (const surface of params.surfaces) {
    postStateToSurface(surface, {
      ...params,
      configuredModel,
      maxToolIterations,
      reasoningEffort,
      language,
      activeMode,
      agentModes,
      customSkills,
      tools,
      agentConfigScope,
      projectInstructions,
      instructionSources,
      compactionSettings
    });
  }
}

type StateContext = SendAgentStateParams & {
  configuredModel: string;
  maxToolIterations: number;
  reasoningEffort: string;
  language: string;
  activeMode: { id: string };
  agentModes: unknown;
  customSkills: unknown;
  tools: ReturnType<typeof getAgentTools>;
  agentConfigScope: string;
  projectInstructions: string;
  instructionSources: unknown;
  compactionSettings: unknown;
};

function omitHistory<T extends { history?: unknown }>(chat: T): Omit<T, 'history'> {
  const { history: _history, ...rest } = chat;
  return rest;
}

function postStateToSurface(surface: WebviewSurface, context: StateContext): void {
  const activeChat = context.chats.getChat(surface.getChatId()) || context.chats.getActiveChat();
  const models = mergeModels(context.modelOptions, context.configuredModel, activeChat.model);
  const activeModel = models.find((model) => model.id === activeChat.model);
  const chatContext = getChatContextEstimate(activeChat.history, context.getSystemPrompt(), activeModel);
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
    workspaceName: getWorkspaceName(),
    tools: context.tools.map((tool) => tool.function.name),
    chats: context.chats.getSummaries(),
    activeChat: webviewActiveChat,
    models,
    maxToolIterations: context.maxToolIterations,
    reasoningEffort: context.reasoningEffort,
    compactionSettings: context.compactionSettings,
    agentLanguage: context.language,
    agentMode: context.activeMode.id,
    agentModes: context.agentModes,
    agentConfigScope: context.agentConfigScope,
    projectInstructions: context.projectInstructions,
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
