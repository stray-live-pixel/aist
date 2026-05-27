import * as vscode from 'vscode';

import { t } from '../../../shared/i18n';
import { getPromptConfig } from '../../config/agentConfigStore';
import { getAgentLanguage } from '../../config/settings';
import { getAgentSettingsSnapshot, getConfiguredModel } from '../../config/settingsSnapshot';
import { buildAgentSystemPrompt, getAgentInstructionSources } from '../../config/systemPrompt';
import { getEditorContext } from '../../context/editorContext';
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
  | { type: 'openChatJson' }
  | { type: 'compactChat' }
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
    'openChatJson',
    'compactChat',
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
    case 'openChatJson':
      await openChatJson(surface, message.chatId || surface.getChatId(), deps);
      return;
    case 'compactChat':
      await compactChat(surface, message.chatId || surface.getChatId(), deps);
      return;
    case 'setModel':
      await setModel(surface, message.model, deps);
      return;
    case 'clear':
      clearChat(surface, deps);
      return;
    case 'copyMessage':
      await vscode.env.clipboard.writeText(message.markdown || '');
      vscode.window.setStatusBarMessage(t('status.copiedMarkdown'), 1800);
      return;
  }
}

/**
 * Открывает snapshot чата как untitled JSON-документ VS Code.
 *
 * История сейчас живёт в workspaceState, поэтому не даём пользователю псевдо-файл из storage, который нельзя безопасно
 * редактировать. Untitled JSON лучше отражает сценарий «посмотреть/сохранить при необходимости» и всегда открывается
 * штатным редактором VS Code без привязки к внутренней БД Memento.
 */
async function openChatJson(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  const chat = deps.chats.getChat(chatId);
  if (!chat) {
    deps.logger.info('Ignoring openChatJson for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  const exportPayload = buildChatJsonExport(chat, surface);
  const document = await vscode.workspace.openTextDocument({
    language: 'json',
    content: `${JSON.stringify(exportPayload, null, 2)}\n`
  });
  await vscode.window.showTextDocument(document, { preview: false });
  deps.logger.info('Chat JSON opened in editor', {
    chatId,
    messageCount: chat.messages.length,
    nextRequestMessageCount: exportPayload.nextPromptContext.messagesSentToModel.length
  });
}

/**
 * Формирует диагностический экспорт, который показывает не только сохранённый chat, но и то, как AIST соберёт
 * следующий запрос к модели. Placeholder user-сообщение нужен явно: без текста будущего prompt невозможно показать
 * финальный user content, но можно показать все системные инструкции, предыдущую history и active editor context.
 */
function buildChatJsonExport(
  chat: NonNullable<ReturnType<AgentWebviewMessageDeps['chats']['getChat']>>,
  surface: WebviewSurface
) {
  const systemPrompt = buildAgentSystemPrompt();
  const editorContext = getEditorContext();
  const settings = getAgentSettingsSnapshot();
  const promptConfig = getPromptConfig();
  const nextUserPromptPlaceholder = '<next user prompt will be inserted here>';
  const nextUserContent = [
    nextUserPromptPlaceholder,
    editorContext ? `\n\nActive editor context:\n${editorContext}` : ''
  ].join('');
  const messagesSentToModel = [
    { role: 'system' as const, content: systemPrompt },
    ...chat.history.filter((message) => message.role !== 'system'),
    { role: 'user' as const, content: nextUserContent }
  ];

  return {
    exportedAt: new Date().toISOString(),
    exportKind: 'aist.chat-json.v1',
    note: 'nextPromptContext mirrors the next model request shape. The final user prompt is represented by a placeholder because it is not known until you press Send.',
    surface: {
      id: surface.id,
      kind: surface.kind,
      chatId: surface.getChatId()
    },
    chat,
    nextPromptContext: {
      model: chat.model,
      language: getAgentLanguage(),
      reasoningEffort: settings.reasoningEffort,
      codexServiceTier: settings.codexServiceTier,
      maxToolIterations: settings.maxToolIterations,
      systemPrompt,
      instructionSources: getAgentInstructionSources(),
      promptConfig: {
        activeInstructionRefs: promptConfig.activeInstructionRefs,
        activeModeRef: promptConfig.activeModeRef,
        activePresetId: promptConfig.activePresetId
      },
      activeEditorContext: editorContext || null,
      persistedHistorySentToModel: chat.history.filter((message) => message.role !== 'system'),
      nextUserPromptPlaceholder,
      messagesSentToModel
    }
  };
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

async function compactChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  const source = deps.chats.getChat(chatId);
  if (!source) {
    deps.logger.info('Ignoring compactChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  if (source.busy) {
    vscode.window.setStatusBarMessage(t('status.stopBeforeCompacting'), 2400);
    deps.sendState(surface);
    return;
  }

  try {
    const chat = await deps.compactChat(source.id, 'manual');
    surface.setChatId(chat.id);
    deps.sendState();
  } catch (error) {
    deps.logger.error('Failed to compact chat', error);
    vscode.window.showErrorMessage(
      t('error.compactChat', { error: error instanceof Error ? error.message : String(error) })
    );
    deps.sendState(surface);
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
    vscode.window.setStatusBarMessage(t('status.stopBeforeDeleting'), 2400);
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
