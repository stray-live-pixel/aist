import type { CodexClient } from '../codex/client';
import type { OpenRouterClient } from '../openrouter/client';
import { discoverAutonomousDefinitions } from './discovery';
import { createAutonomousEngineRegistry } from './engines/registry';
import { AutonomousSessionStore } from './storage/sessionStore';
import type { AutonomousState } from './types';

export type BuildAutonomousStateOptions = {
  workspaceRoot: string;
  workspaceName: string;
  openRouterClient?: OpenRouterClient;
  codexClient?: CodexClient;
};

/**
 * Собирает state для autonomous webview из discovery, registry и session store.
 * Presenter не тянет chat state, чтобы ошибки/сессии autonomous не попадали в
 * текущий интерактивный чат и не меняли его lifecycle.
 */
export async function buildAutonomousState(options: BuildAutonomousStateOptions): Promise<AutonomousState> {
  const definitions = await discoverAutonomousDefinitions({ workspaceRoot: options.workspaceRoot });
  const registry = createAutonomousEngineRegistry({
    openRouterClient: options.openRouterClient,
    codexClient: options.codexClient
  });
  const sessionStore = new AutonomousSessionStore(options.workspaceRoot);
  const sessions = await sessionStore.listSessions();

  return {
    workspaceName: options.workspaceName,
    storageRoot: sessionStore.rootPath,
    definitions,
    engines: registry.list(),
    sessions,
    diagnostics: definitions.diagnostics
  };
}
