import * as vscode from 'vscode';

import { getConfiguredModel } from '../../config/settingsSnapshot';
import type { WebviewMessage, WebviewSurface } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type ChatMessage = Extract<
  WebviewMessage,
  | { type: 'ask' }
  | { type: 'newChat' }
  | { type: 'duplicateChat' }
  | { type: 'deleteChat' }
  | { type: 'setActiveChat' }
  | { type: 'openChatInEditor' }
  | { type: 'setModel' }
  | { type: 'clear' }
  | { type: 'copyMessage' }
>;

export function isChatMessage(message: WebviewMessage): message is ChatMessage {
  return [
    'ask',
    'newChat',
    'duplicateChat',
    'deleteChat',
    'setActiveChat',
    'openChatInEditor',
    'setModel',
    'clear',
    'copyMessage'
  ].includes(message.type);
}

/**
 * Обрабатывает команды webview, связанные с чатами и их сообщениями.
 *
 * Эти сценарии держатся отдельно от настроек/авторизации: так при добавлении
 * новых chat actions не растет общий dispatcher и проще проверять retarget
 * удаленных чатов между sidebar/editor поверхностями.
 */
export async function handleWebviewChatMessage(
  surface: WebviewSurface,
  message: ChatMessage,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  switch (message.type) {
    case 'ask':
      await deps.ask(surface.getChatId(), message.prompt);
      return;
    case 'newChat':
      createChatFromWebview(surface, deps);
      return;
    case 'duplicateChat':
      duplicateChat(surface, message.chatId, deps);
      return;
    case 'deleteChat':
      deleteChat(surface, message.chatId, deps);
      return;
    case 'setActiveChat':
      setActiveChat(surface, message.chatId, deps);
      return;
    case 'openChatInEditor':
      deps.openChatInEditor(message.chatId || surface.getChatId());
      return;
    case 'setModel':
      await setModel(surface, message.model, deps);
      return;
    case 'clear':
      clearChat(surface, deps);
      return;
    case 'copyMessage':
      await vscode.env.clipboard.writeText(message.markdown || '');
      vscode.window.setStatusBarMessage('Copied message markdown', 1800);
      return;
  }
}

function createChatFromWebview(surface: WebviewSurface, deps: AgentWebviewMessageDeps): void {
  const chat = deps.chats.createChat(getConfiguredModel());
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

function duplicateChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): void {
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

function deleteChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): void {
  const chat = deps.chats.getChat(chatId);
  if (!chat) {
    deps.logger.info('Ignoring deleteChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  if (chat.busy) {
    vscode.window.setStatusBarMessage('aist: Stop the chat before deleting it.', 2400);
    deps.logger.info('Ignoring deleteChat for running chat', { chatId });
    deps.sendState(surface);
    return;
  }

  const nextChat = deps.chats.deleteChat(chatId, getConfiguredModel());
  deps.retargetDeletedChat(chatId, nextChat.id);
  deps.logger.info('Chat deleted from webview', {
    surfaceId: surface.id,
    deletedChatId: chatId,
    activeChatId: nextChat.id,
    chatCount: deps.chats.getSummaries().length
  });
  deps.sendState();
}

function setActiveChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): void {
  if (!deps.chats.getChat(chatId)) {
    deps.logger.info('Ignoring setActiveChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  surface.setChatId(chatId);
  deps.sendState(surface);
}

async function setModel(surface: WebviewSurface, model: string, deps: AgentWebviewMessageDeps): Promise<void> {
  const chat = deps.chats.getChat(surface.getChatId()) || deps.chats.getActiveChat();
  deps.chats.setModel(chat.id, model);
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('model', model, vscode.ConfigurationTarget.Workspace);
  deps.sendState();
}

function clearChat(surface: WebviewSurface, deps: AgentWebviewMessageDeps): void {
  const chat = deps.chats.getChat(surface.getChatId()) || deps.chats.getActiveChat();
  deps.chats.clearChat(chat.id);
  deps.sendState(surface);
}
