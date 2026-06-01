import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function duplicateChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): void {
  if (!deps.chats.getChat(chatId)) {
    deps.logger.info('Ignoring duplicateChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  const chat = deps.chats.duplicateChat(chatId);
  surface.setChatId(chat.id);
  deps.logger.info('Chat duplicated from webview', {
    surfaceId: surface.id,
    sourceChatId: chatId,
    chatId: chat.id,
    title: chat.title,
    chatCount: deps.chats.getSummaries().length
  });
  deps.sendState();
}
