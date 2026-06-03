import { getDefaultModelSettings } from '../config/settingsSnapshot';
import type { WebviewSurface } from '../types';
import { postWebviewLoading } from '../webview/postWebviewLoading';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: создаёт daemon-chat по нажатию «Новый чат» внутри webview и переключает текущую поверхность на него.
 * Зачем нужно: пользователь должен сразу видеть состояние создания, а не старый диалог, из которого нажал кнопку.
 * Какую продуктовую проблему решает: новый чат открывается без промежуточного мигания предыдущего чата.
 */
export async function createChatFromDaemonWebview({
  state,
  callbacks,
  surface,
  loadingMessage
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  surface: WebviewSurface;
  loadingMessage: string;
}): Promise<void> {
  // DaemonChatStore при createChat делает upsert и setActiveChat, то есть два onDidChange.
  // Подавляем оба авто-broadcast, чтобы webview не получил промежуточный state со старой привязкой surface.
  const previousSuppressedBroadcasts = state.suppressedChatStoreStateBroadcasts;
  state.suppressedChatStoreStateBroadcasts += 2;
  postWebviewLoading({ surface, message: loadingMessage });

  try {
    const chat = await state.daemonRuntime.createChat(getDefaultModelSettings());
    state.sidebarPage = 'chat';
    surface.setChatId(chat.id);
    state.logger.info('Chat created from webview', {
      surfaceId: surface.id,
      kind: surface.kind,
      chatId: chat.id,
      title: chat.title,
      chatCount: state.chats.getSummaries().length
    });

    callbacks.sendState();
    if (surface.kind === 'sidebar') {
      callbacks.postPage(surface, 'chat');
    }
    state.suppressedChatStoreStateBroadcasts = previousSuppressedBroadcasts;
  } catch (error) {
    // Если daemon упал до store-событий, возвращаем счётчик, чтобы будущие обновления не пропали.
    state.suppressedChatStoreStateBroadcasts = previousSuppressedBroadcasts;
    throw error;
  }
}
