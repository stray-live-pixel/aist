import * as vscode from 'vscode';

import { recordPerformanceTelemetry } from '../../../core/features/performanceTelemetry';
import type { ModelProvider } from '../../../core/shared/types/types';
import { t } from '../../shared/i18n';
import { getConfiguredModel, getDefaultModelSettings } from '../config/settingsSnapshot';
import type { WebviewMessage, WebviewSurface } from '../types';
import { handleAgentWebviewMessage } from '../webview/messages';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { createChatFromDaemonWebview } from './createChatFromDaemonWebview';
import { openIsolationChatFromController } from './openIsolationChatFromController';
import { reportControllerError } from './reportControllerError';
import { toToolApprovalDecision } from './toToolApprovalDecision';

/** Что это: безопасный wrapper обработки webview message; зачем нужно: error path останавливает daemon run и обновляет UI; проблема: команда webview не оставляет агент в подвешенном состоянии. */
export async function handleWebviewMessage({
  state,
  callbacks,
  surface,
  message
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  surface: WebviewSurface;
  message: WebviewMessage;
}): Promise<void> {
  try {
    if (message.type === 'performance.renderMetric') {
      recordRenderPerformanceMessage({ state, surface, message });
      return;
    }

    await handleWebviewMessageUnsafe({ state, callbacks, surface, message });
  } catch (error) {
    await state.daemonRuntime
      .stop()
      .catch((stopError) => state.logger.error('Failed to stop daemon run after webview error', stopError));
    reportControllerError({ state, callbacks, error, context: `webview command: ${message.type}` });
    state.logger.error('Unhandled webview message error', error);
    callbacks.sendState(surface);
  }
}

/**
 * Что это: сохраняет batched render-метрику из webview.
 * Зачем нужно: React-компоненты сообщают количество ререндеров без частых FS-записей.
 * Какую продуктовую проблему решает: можно увидеть, какой UI-компонент стал bottleneck после изменения.
 */
function recordRenderPerformanceMessage({
  state,
  surface,
  message
}: {
  state: AgentControllerState;
  surface: WebviewSurface;
  message: Extract<WebviewMessage, { type: 'performance.renderMetric' }>;
}): void {
  recordPerformanceTelemetry({
    operation: 'webview.render',
    extensionVersion: String(state.context.extension.packageJSON?.version || '0.0.0'),
    workspaceRoot: state.daemonRuntime.workspaceRoot,
    chatId: message.chatId || surface.getChatId(),
    surfaceId: surface.id,
    surfaceKind: surface.kind,
    startedAt: message.startedAt,
    finishedAt: message.finishedAt,
    durationMs: message.durationMs,
    status: 'success',
    renderCount: message.renderCount,
    messageCount: message.messageCount,
    reason: message.component,
    meta: { component: message.component, maxRenderDurationMs: message.maxRenderDurationMs }
  });
}

/** Что это: dispatch webview message между daemon-only командами и общими handlers; зачем нужно: сохранить совместимость старого UI API; проблема: каждый webview action попадает в правильный backend. */
async function handleWebviewMessageUnsafe({
  state,
  callbacks,
  surface,
  message
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  surface: WebviewSurface;
  message: WebviewMessage;
}): Promise<void> {
  if (await handleDaemonWebviewMessage({ state, callbacks, surface, message })) return;
  await handleAgentWebviewMessage(surface, message, {
    chats: state.chats,
    logger: state.logger,
    secretStore: state.secretStore,
    getSidebarPage: () => state.sidebarPage,
    setSidebarPage: (page) => {
      state.sidebarPage = page;
    },
    sendState: (targetSurface) => callbacks.sendState(targetSurface),
    postPage: (targetSurface, page) => callbacks.postPage(targetSurface, page),
    refreshModels: (provider?: ModelProvider) => callbacks.refreshModels(true, provider || 'all'),
    refreshCodexAuthState: () => {
      void callbacks.loginCodex;
      void import('./codexAuthActions').then(({ refreshCodexAuthState }) =>
        refreshCodexAuthState({ state, callbacks })
      );
    },
    ask: (chatId, prompt, options) => callbacks.ask(chatId, prompt, options),
    compactChat: (chatId, trigger) => state.daemonRuntime.compactChat(chatId, trigger),
    saveReflectionCandidate: (chatId, candidateId) => state.daemonRuntime.saveReflectionCandidate(chatId, candidateId),
    rejectReflectionCandidate: (chatId, candidateId) =>
      state.daemonRuntime.rejectReflectionCandidate(chatId, candidateId),
    openChatInEditor: (chatId) => callbacks.openChatInEditor(chatId),
    retargetDeletedChat: (deletedChatId, nextChatId) => callbacks.retargetDeletedChat(deletedChatId, nextChatId),
    loginCodex: () => callbacks.loginCodex(),
    logoutCodex: () => callbacks.logoutCodex(),
    resolveToolCall: (messageId, decision) => callbacks.resolveToolCall(messageId, decision),
    syncToolPermissions: () => state.daemonRuntime.syncToolPermissions(),
    openWorkspaceFile: (filePath, line, column, endLine, endColumn) =>
      callbacks.openWorkspaceFile(filePath, line, column, endLine, endColumn),
    stopCurrentRun: (chatId) => state.daemonRuntime.stop(chatId).then(() => callbacks.sendState()),
    refreshChatVcs: (chatId) => callbacks.refreshChatVcs(chatId),
    isolateChatVcs: (chatId) => callbacks.isolateChatVcs(chatId),
    commitAndForcePushChatVcs: (chatId) => callbacks.commitAndForcePushChatVcs(chatId),
    mergeChatVcsToMain: (chatId) => callbacks.mergeChatVcsToMain(chatId)
  });
}

/** Что это: daemon-only обработчик webview messages; зачем нужно: chat CRUD/run идут через daemonRuntime; проблема: extension не содержит второго runtime backend. */
async function handleDaemonWebviewMessage({
  state,
  callbacks,
  surface,
  message
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  surface: WebviewSurface;
  message: WebviewMessage;
}): Promise<boolean> {
  switch (message.type) {
    case 'ask':
      await callbacks.ask(surface.getChatId(), message.prompt, {
        skipUserMessage: message.continueWithoutUserPrompt,
        attachments: message.attachments
      });
      return true;
    case 'newChat':
      await createChatFromDaemonWebview({
        state,
        callbacks,
        surface,
        loadingMessage: t('status.creatingChatMessage')
      });
      return true;
    case 'deleteChat': {
      const nextChat = await state.daemonRuntime.deleteChat(message.chatId, getConfiguredModel());
      callbacks.retargetDeletedChat(message.chatId, nextChat.id);
      callbacks.sendState();
      return true;
    }
    case 'setModel': {
      const chat = state.chats.getChat(surface.getChatId()) || state.chats.getActiveChat();
      await state.daemonRuntime.setModel(chat.id, message.model);
      callbacks.sendState();
      return true;
    }
    case 'setChatModelSettings': {
      const chat = state.chats.getChat(surface.getChatId()) || state.chats.getActiveChat();
      await state.daemonRuntime.setModelSettings(chat.id, message.settings);
      callbacks.sendState();
      return true;
    }
    case 'resetChatModelSettings': {
      const chat = state.chats.getChat(surface.getChatId()) || state.chats.getActiveChat();
      await state.daemonRuntime.setModelSettings(chat.id, getDefaultModelSettings());
      callbacks.sendState();
      return true;
    }
    case 'refreshModelsForProvider':
      await callbacks.refreshModels(true, message.provider);
      return true;
    case 'clear': {
      const chat = state.chats.getChat(surface.getChatId()) || state.chats.getActiveChat();
      await state.daemonRuntime.clearChat(chat.id);
      callbacks.sendState(surface);
      return true;
    }
    case 'compactChat': {
      const chat = await state.daemonRuntime.compactChat(message.chatId || surface.getChatId(), 'manual');
      surface.setChatId(chat.id);
      callbacks.sendState();
      return true;
    }
    case 'runMemoryAnalysis':
      await state.daemonRuntime.analyzeMemoryChat(message.chatId || surface.getChatId());
      callbacks.sendState(surface);
      return true;
    case 'resolveToolCall':
      await state.daemonRuntime.resolveToolCall(message.messageId, toToolApprovalDecision({ message }));
      return true;
    case 'stop':
      await state.daemonRuntime.stop(message.chatId || surface.getChatId());
      callbacks.sendState();
      return true;
    case 'isolation.start':
      await state.daemonRuntime.startIsolationSession(message.prompt, message.flowId, {
        provider: message.provider,
        runnerId: message.runnerId
      });
      callbacks.sendState(surface);
      return true;
    case 'isolation.remoteServer.upsert':
      await state.daemonRuntime.upsertIsolationRemoteServer(message.server);
      callbacks.sendState(surface);
      return true;
    case 'isolation.remoteServer.delete':
      await state.daemonRuntime.deleteIsolationRemoteServer(message.serverId);
      callbacks.sendState(surface);
      return true;
    case 'isolation.continue':
      await state.daemonRuntime.continueIsolationSession(message.sessionId, message.prompt, message.flowId);
      callbacks.sendState(surface);
      return true;
    case 'isolation.stop':
      await state.daemonRuntime.stopIsolationSession(message.sessionId);
      callbacks.sendState(surface);
      return true;
    case 'isolation.destroy':
      await state.daemonRuntime.destroyIsolationSession(message.sessionId);
      callbacks.sendState(surface);
      return true;
    case 'isolation.openWorktree': {
      const session = state.daemonRuntime
        .listIsolationSessions()
        .find((candidate) => candidate.sessionId === message.sessionId);
      if (!session?.worktreePath) {
        vscode.window.showWarningMessage('Isolated worktree is not ready yet.');
        return true;
      }
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(session.worktreePath), {
        forceNewWindow: true
      });
      return true;
    }
    case 'isolation.openPr': {
      const session = state.daemonRuntime
        .listIsolationSessions()
        .find((candidate) => candidate.sessionId === message.sessionId);
      if (!session?.prUrl) {
        vscode.window.showWarningMessage('Pull request is not ready yet.');
        return true;
      }
      await vscode.env.openExternal(vscode.Uri.parse(session.prUrl));
      return true;
    }
    case 'isolation.openChat':
      await openIsolationChatFromController({ state, callbacks, sessionId: message.sessionId });
      return true;
    case 'isolation.loadEvents': {
      const events = await state.daemonRuntime.getIsolationEvents(message.sessionId);
      await surface.webview.postMessage({
        type: 'isolation.events',
        sessionId: message.sessionId,
        events
      });
      return true;
    }
    case 'isolation.refresh':
      await state.daemonRuntime.refreshState();
      callbacks.sendState(surface);
      return true;
    case 'duplicateChat':
      vscode.window.setStatusBarMessage('Duplicate chat is not available in AIST daemon-only mode yet.', 2400);
      callbacks.sendState(surface);
      return true;
    default:
      return false;
  }
}
