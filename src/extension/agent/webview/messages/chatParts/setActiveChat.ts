import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function setActiveChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): void {
  if (!deps.chats.getChat(chatId)) {
    deps.logger.info('Ignoring setActiveChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  surface.setChatId(chatId);
  deps.sendState(surface);
}
