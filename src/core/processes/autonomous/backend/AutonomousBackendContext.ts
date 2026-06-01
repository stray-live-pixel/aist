import type { FileBackedConfigStore, FileSecretStore } from '../../../app/config/config';
import type { FetchLike, ModelClient } from '../../../entities/model/modelTransport';
import type { AutonomousEngineRegistry } from '../engines/types';
import type { AutonomousSessionStore } from '../storage/sessionStore';
import type { AutonomousSessionView } from '../types';
import type { AutonomousBackendEvent } from './AutonomousBackendEvent';
import type { AutonomousBackendLogger } from './AutonomousBackendLogger';

/**
 * Что это: общий mutable-контекст AutonomousBackend после декомпозиции.
 * Зачем нужно: сценарные функции получают один источник workspace, stores, listeners и running sessions.
 * Какую продуктовую проблему решает: запуск flow/run, stop и events не расходятся по разным копиям состояния.
 */
export type AutonomousBackendContext = {
  readonly workspaceRoot: string;
  readonly workspaceName: string;
  readonly homeDir?: string;
  readonly env: Record<string, string | undefined>;
  readonly fetch?: FetchLike;
  readonly modelClient?: ModelClient;
  readonly logger: AutonomousBackendLogger;
  readonly now: () => number;
  readonly idFactory: () => string;
  readonly configStore: FileBackedConfigStore;
  readonly secretStore: FileSecretStore;
  readonly sessionStore: AutonomousSessionStore;
  readonly listeners: Set<(event: AutonomousBackendEvent) => void>;
  readonly runningSessions: Map<string, AbortController>;
  readonly completions: Map<string, Promise<AutonomousSessionView>>;
  readonly createEngineRegistry: () => AutonomousEngineRegistry;
};
