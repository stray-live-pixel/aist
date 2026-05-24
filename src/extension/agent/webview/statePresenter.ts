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
import { getActiveAgentMode, getAgentLanguage, getAgentModes } from '../config/settings';
import { getAgentSettingsSnapshot } from '../config/settingsSnapshot';
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
      tools
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
};

function postStateToSurface(surface: WebviewSurface, context: StateContext): void {
  const activeChat = context.chats.getChat(surface.getChatId()) || context.chats.getActiveChat();
  const models = mergeModels(context.modelOptions, context.configuredModel, activeChat.model);
  const activeModel = models.find((model) => model.id === activeChat.model);
  const chatContext = getChatContextEstimate(activeChat.history, context.getSystemPrompt(), activeModel);
  const { history: _history, ...webviewChat } = activeChat;
  const webviewActiveChat = {
    ...webviewChat,
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
    agentLanguage: context.language,
    agentMode: context.activeMode.id,
    agentModes: context.agentModes,
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
