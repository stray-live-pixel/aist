import { getDefaultModelSettings } from '../../../config/settingsSnapshot';
import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function createChatFromWebview(surface: WebviewSurface, deps: AgentWebviewMessageDeps): void {
  const chat = deps.chats.createChat(getDefaultModelSettings());
  surface.setChatId(chat.id);
  if (surface.kind === 'sidebar') {
    deps.setSidebarPage('chat');
  }
  deps.logger.info('Chat created from webview', {
    surfaceId: surface.id,
    kind: surface.kind,
    chatId: chat.id,
    title: chat.title,
    chatCount: deps.chats.getSummaries().length
  });
  deps.sendState();
  if (surface.kind === 'sidebar') {
    deps.postPage(surface, 'chat');
  }
}
