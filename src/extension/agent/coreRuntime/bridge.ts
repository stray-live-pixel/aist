import * as vscode from 'vscode';

import { ChatRepository } from '../../../core/chatRepository';
import type { ConfigStore, SecretStore } from '../../../core/config';
import { RunRepository } from '../../../core/runRepository';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { AistLogger } from '../../shared/logger';
import { createFileBackedChatStore } from './fileBackedChatStore';
import {
  VscodeActiveEditorContextAdapter,
  type VscodeActiveEditorContextProvider,
  VscodeCoreLoggerAdapter,
  VscodePreviewEditAdapter,
  type VscodePreviewEditProvider,
  VscodeStatusNotificationAdapter,
  type VscodeStatusNotifier,
  VscodeWorkspaceRootAdapter,
  type VscodeWorkspaceRootProvider,
  createVscodeCoreConfigStore,
  createVscodeCoreSecretStore
} from './vscodeAdapters';

export const CORE_RUNTIME_ACTIVE_CHAT_ID_KEY = 'coreRuntime.activeChatId';

export type VscodeCoreRuntimeBridge = {
  mode: 'core';
  workspaceRoot: string;
  chats: AgentChatStore;
  runRepository: RunRepository;
  workspaceRootProvider: VscodeWorkspaceRootProvider;
  activeEditorContextProvider: VscodeActiveEditorContextProvider;
  previewEditProvider: VscodePreviewEditProvider;
  notifier: VscodeStatusNotifier;
  runtimeLogger: VscodeCoreLoggerAdapter;
  configStore: ConfigStore;
  secretStore: SecretStore;
};

export async function createVscodeCoreRuntimeBridge(
  context: vscode.ExtensionContext,
  logger: AistLogger,
  defaultModel: string
): Promise<VscodeCoreRuntimeBridge> {
  const workspaceRootProvider = new VscodeWorkspaceRootAdapter();
  const workspaceRoot = workspaceRootProvider.getWorkspaceRoot();
  const chatRepository = new ChatRepository({ workspaceRoot });
  const runRepository = new RunRepository({ workspaceRoot });
  const chats = await createFileBackedChatStore({
    repository: chatRepository,
    defaultModel,
    activeChatId: context.workspaceState.get<string>(CORE_RUNTIME_ACTIVE_CHAT_ID_KEY),
    saveActiveChatId: (chatId) => context.workspaceState.update(CORE_RUNTIME_ACTIVE_CHAT_ID_KEY, chatId),
    logger
  });

  logger.info('VS Code core runtime bridge initialized', {
    workspaceRoot,
    chatCount: chats.getSummaries().length,
    activeChatId: chats.getActiveChat().id
  });

  return {
    mode: 'core',
    workspaceRoot,
    chats,
    runRepository,
    workspaceRootProvider,
    activeEditorContextProvider: new VscodeActiveEditorContextAdapter(),
    previewEditProvider: new VscodePreviewEditAdapter(),
    notifier: new VscodeStatusNotificationAdapter(),
    runtimeLogger: new VscodeCoreLoggerAdapter(logger),
    configStore: createVscodeCoreConfigStore(),
    secretStore: createVscodeCoreSecretStore(context.secrets)
  };
}
