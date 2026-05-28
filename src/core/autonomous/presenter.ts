import { discoverAutonomousDefinitions } from './discovery';
import { createAutonomousEngineRegistry } from './engines/registry';
import type { AutonomousEngineRegistry } from './engines/types';
import { AutonomousSessionStore } from './storage/sessionStore';
import type { AutonomousState } from './types';

export type BuildAutonomousStateOptions = {
  workspaceRoot: string;
  workspaceName: string;
  engineRegistry?: AutonomousEngineRegistry;
};

/**
 * Собирает state для autonomous webview из discovery, registry и session store.
 * Presenter не тянет chat state, чтобы ошибки/сессии autonomous не попадали в
 * текущий интерактивный чат и не меняли его lifecycle.
 */
export async function buildAutonomousState(options: BuildAutonomousStateOptions): Promise<AutonomousState> {
  const definitions = await discoverAutonomousDefinitions({ workspaceRoot: options.workspaceRoot });
  const registry = options.engineRegistry || createAutonomousEngineRegistry();
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
