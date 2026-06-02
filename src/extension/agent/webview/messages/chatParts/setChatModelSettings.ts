import { getDefaultModelSettings } from '../../../config/settingsSnapshot';
import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function setChatModelSettings(
  surface: WebviewSurface,
  settings: Partial<ReturnType<typeof getDefaultModelSettings>>,
  deps: AgentWebviewMessageDeps
): void {
  const chat = deps.chats.getChat(surface.getChatId()) || deps.chats.getActiveChat();
  deps.chats.setModelSettings(chat.id, settings);
  deps.sendState();
}
