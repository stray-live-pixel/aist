import type { WebviewMessage, WebviewSurface } from '../../types';
import { handleWebviewChatMessage, isChatMessage } from './chat';
import { handleWebviewCodexMessage, isCodexMessage } from './codex';
import { handleWebviewPermissionMessage, isPermissionMessage } from './permissions';
import { handleWebviewSettingsMessage, isSettingsMessage } from './settings';
import { handleWebviewSkillMessage, isSkillMessage } from './skills';
import type { AgentWebviewMessageDeps } from './types';

/**
 * Маршрутизирует входящие сообщения webview по доменным обработчикам.
 *
 * Dispatcher намеренно не содержит бизнес-логики: он только фиксирует порядок
 * проверки команд и оставляет сценарии в небольших модулях chat/settings/skills.
 * Если добавляется новый message.type, его нужно отнести к одному из доменов или
 * явно обработать здесь как инфраструктурную команду.
 */
export async function handleAgentWebviewMessage(
  surface: WebviewSurface,
  message: WebviewMessage,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  if (message.type === 'webviewReady') {
    handleWebviewReady(surface, deps);
    return;
  }

  if (isChatMessage(message)) {
    await handleWebviewChatMessage(surface, message, deps);
    return;
  }

  if (isPermissionMessage(message)) {
    await handleWebviewPermissionMessage(message, deps);
    return;
  }

  if (isSettingsMessage(message)) {
    await handleWebviewSettingsMessage(message, deps);
    return;
  }

  if (isSkillMessage(message)) {
    await handleWebviewSkillMessage(message, deps);
    return;
  }

  if (isCodexMessage(message)) {
    await handleWebviewCodexMessage(message, deps);
    return;
  }

  if (message.type === 'openWorkspaceFile') {
    await deps.openWorkspaceFile(message.path, message.line, message.column);
    return;
  }

  if (message.type === 'stop') {
    deps.stopCurrentRun();
  }
}

function handleWebviewReady(surface: WebviewSurface, deps: AgentWebviewMessageDeps): void {
  deps.logger.info('webviewReady received', {
    surfaceId: surface.id,
    kind: surface.kind,
    chatId: surface.getChatId()
  });
  deps.sendState(surface);
  deps.postPage(surface, surface.kind === 'sidebar' ? deps.getSidebarPage() : 'chat');
  deps.refreshModels();
  deps.refreshCodexAuthState();
}
