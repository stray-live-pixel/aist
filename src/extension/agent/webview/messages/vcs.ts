import type { WebviewMessage, WebviewSurface } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type VcsMessage = Extract<
  WebviewMessage,
  | { type: 'vcs.refresh' }
  | { type: 'vcs.isolateChat' }
  | { type: 'vcs.commitAndForcePush' }
  | { type: 'vcs.mergeToMain' }
>;

export function isVcsMessage(message: WebviewMessage): message is VcsMessage {
  return ['vcs.refresh', 'vcs.isolateChat', 'vcs.commitAndForcePush', 'vcs.mergeToMain'].includes(message.type);
}

export async function handleWebviewVcsMessage(
  surface: WebviewSurface,
  message: VcsMessage,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  const chatId = surface.getChatId();
  switch (message.type) {
    case 'vcs.refresh':
      await deps.refreshChatVcs(chatId);
      return;
    case 'vcs.isolateChat':
      await deps.isolateChatVcs(chatId);
      return;
    case 'vcs.commitAndForcePush':
      await deps.commitAndForcePushChatVcs(chatId);
      return;
    case 'vcs.mergeToMain':
      await deps.mergeChatVcsToMain(chatId);
      return;
  }
}
