import { FileSecretStore } from '../../../core/app/config/config';
import { CodexAuthSessionProvider } from '../../../core/entities/model/codexAuth';
import { FALLBACK_MODEL_OPTIONS } from '../../../core/entities/model/modelDefaults';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { AistLogger } from '../../shared/logger';
import type { VscodeDaemonRuntimeBridge } from '../daemon/bridge';
import { createChatVcsService } from '../vcs/chatVcs';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: создаёт исходное состояние AgentController.
 * Зачем нужно: constructor фасада остаётся коротким, а все сервисы создаются в одном месте.
 * Какую продуктовую проблему решает: auth, secrets, VCS и webview surfaces имеют единый lifecycle.
 */
export function createAgentControllerState({
  context,
  chats,
  logger,
  daemonRuntime
}: {
  context: import('vscode').ExtensionContext;
  chats: AgentChatStore;
  logger: AistLogger;
  daemonRuntime: VscodeDaemonRuntimeBridge;
}): AgentControllerState {
  const secretStore = new FileSecretStore({ logger: { warn: (message, details) => logger.info(message, details) } });

  return {
    context,
    chats,
    logger,
    daemonRuntime,
    editorSurfaces: new Map(),
    secretStore,
    codexAuthProvider: new CodexAuthSessionProvider(secretStore, { logger }),
    chatVcs: createChatVcsService({ workspaceRoot: daemonRuntime.workspaceRoot }),
    sidebarView: undefined,
    sidebarChatId: undefined,
    sidebarPage: 'chat',
    modelOptions: [...FALLBACK_MODEL_OPTIONS],
    codexAuthenticated: false,
    suppressedChatStoreStateBroadcasts: 0
  };
}
