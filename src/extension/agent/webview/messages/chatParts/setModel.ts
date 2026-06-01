import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export async function setModel(surface: WebviewSurface, model: string, deps: AgentWebviewMessageDeps): Promise<void> {
  const chat = deps.chats.getChat(surface.getChatId()) || deps.chats.getActiveChat();
  deps.chats.setModel(chat.id, model);
  deps.sendState();
}
