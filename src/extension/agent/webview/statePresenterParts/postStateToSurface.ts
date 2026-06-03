import { recordPerformanceTelemetry } from '../../../../core/features/performanceTelemetry';
import { getWorkspaceName } from '../../../shared/workspace';
import {
  getActiveToolPermissionPresetId,
  getToolPermissionItems,
  getToolPermissionPresets
} from '../../../tools/permissions';
import { mergeModels } from '../../models/models';
import { type WebviewSurface } from '../../types';
import { mapChatToWebviewActiveChat } from '../stateMapping';
import { StateContext } from './StateContext';

export function postStateToSurface(surface: WebviewSurface, context: StateContext): void {
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

  const postedAt = Date.now();
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
    performanceTelemetry: context.performanceTelemetry,
    projectToolDiagnostics: context.projectToolDiagnostics,
    agentLanguage: context.language,
    agentMode: context.activeMode.id,
    agentModes: context.agentModes,
    agentConfigScope: context.agentConfigScope,
    projectInstructions: context.projectInstructions,
    promptConfig: context.promptConfig,
    memoryItems: context.memoryItems,
    subagentRuns: context.subagentRunsByChatId.get(activeChat.id) || [],
    instructionSources: context.instructionSources,
    customSkills: context.customSkills,
    codexAuthenticated: context.codexAuthenticated,
    toolPermissions: getToolPermissionItems(),
    toolPermissionPresets: getToolPermissionPresets(),
    activeToolPermissionPresetId: getActiveToolPermissionPresetId()
  } as const;

  void surface.webview.postMessage(stateMessage).then(
    (delivered) => {
      recordStatePostPerformance({ context, surface, chatId: activeChat.id, postedAt, status: 'success' });
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
      recordStatePostPerformance({ context, surface, chatId: activeChat.id, postedAt, status: 'error' });
      context.logger.error('Failed to post state to webview', error);
    }
  );
}

/**
 * Что это: фиксирует latency отправки полного state в конкретную webview surface.
 * Зачем нужно: большой snapshot чата может тормозить extension/webview при параллельных агентах.
 * Какую продуктовую проблему решает: аналитика показывает, когда bottleneck — не модель, а доставка UI-state.
 */
function recordStatePostPerformance({
  context,
  surface,
  chatId,
  postedAt,
  status
}: {
  context: StateContext;
  surface: WebviewSurface;
  chatId: string;
  postedAt: number;
  status: 'success' | 'error';
}): void {
  recordPerformanceTelemetry({
    operation: 'webview.state',
    extensionVersion: context.extensionVersion,
    chatId,
    surfaceId: surface.id,
    surfaceKind: surface.kind,
    startedAt: postedAt,
    finishedAt: Date.now(),
    status
  });
}
