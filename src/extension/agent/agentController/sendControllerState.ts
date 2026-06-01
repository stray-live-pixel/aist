import { buildAgentSystemPrompt } from '../config/systemPrompt';
import type { WebviewSurface } from '../types';
import { postWebviewLoading } from '../webview/postWebviewLoading';
import { sendAgentState } from '../webview/statePresenter';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { getSurfaces } from './getSurfaces';

/**
 * Что это: отправляет полный AgentState на выбранные webview surfaces.
 * Зачем нужно: state включает chats, models, auth, subagent runs и system prompt.
 * Какую продуктовую проблему решает: sidebar/editor всегда получают полный снимок для восстановления UI.
 */
export function sendControllerState({
  state,
  callbacks,
  targetSurface
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  targetSurface?: WebviewSurface;
}): void {
  const surfaces = targetSurface ? [targetSurface] : getSurfaces({ state, callbacks });
  const readySurfaces = surfaces.filter((surface) => !postPendingChatCreationState({ surface }));
  if (!readySurfaces.length) {
    return;
  }

  void Promise.all(readySurfaces.map((surface) => state.daemonRuntime.listSubagentRuns(surface.getChatId())))
    .then((runsBySurface) => postState({ state, surfaces: readySurfaces, runsBySurface }))
    .catch((error) => {
      state.logger.error('Failed to load subagent runs for webview state', error);
      postState({ state, surfaces: readySurfaces, runsBySurface: [] });
    });
}

/**
 * Что это: отправляет loading во временную вкладку создания чата и блокирует full state для неё.
 * Зачем нужно: пока daemon создаёт чат в FS, editor не должен показывать активный соседний чат.
 * Какую продуктовую проблему решает: пользователь видит честный статус «чат создаётся» без рассинхронизации.
 */
function postPendingChatCreationState({ surface }: { surface: WebviewSurface }): boolean {
  if (!surface.isPendingChatCreation?.()) {
    return false;
  }

  postWebviewLoading({ surface, message: surface.getPendingChatCreationMessage?.() || 'Creating chat...' });
  return true;
}

/**
 * Что это: низкоуровневая отправка statePresenter payload.
 * Зачем нужно: success/fallback ветки отличаются только subagentRunsByChatId.
 * Какую продуктовую проблему решает: statePresenter вызывается единообразно и без дублирования больших объектов.
 */
function postState({
  state,
  surfaces,
  runsBySurface
}: {
  state: AgentControllerState;
  surfaces: WebviewSurface[];
  runsBySurface: Awaited<ReturnType<AgentControllerState['daemonRuntime']['listSubagentRuns']>>[];
}): void {
  sendAgentState({
    extensionVersion: String(state.context.extension.packageJSON?.version || '0.0.0'),
    surfaces,
    chats: state.chats,
    logger: state.logger,
    secretStore: state.secretStore,
    modelOptions: state.modelOptions,
    codexAuthenticated: state.codexAuthenticated,
    subagentRunsByChatId: new Map(
      surfaces.map((surface, index) => [surface.getChatId(), [...(runsBySurface[index] || [])]])
    ),
    getSystemPrompt: () => buildAgentSystemPrompt()
  });
}
