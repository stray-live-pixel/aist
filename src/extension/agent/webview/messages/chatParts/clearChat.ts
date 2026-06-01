import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function clearChat(surface: WebviewSurface, deps: AgentWebviewMessageDeps): void {
  const chat = deps.chats.getChat(surface.getChatId()) || deps.chats.getActiveChat();
  deps.chats.clearChat(chat.id);
  deps.sendState(surface);
}
