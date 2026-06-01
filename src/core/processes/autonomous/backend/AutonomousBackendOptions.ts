import type { FetchLike, ModelClient } from '../../../entities/model/modelTransport';
import type { AutonomousBackendLogger } from './AutonomousBackendLogger';

/**
 * Что это: настройки создания автономного backend для workspace.
 * Зачем нужно: CLI/daemon/tests могут подменять окружение, модельный клиент, fetch и часы.
 * Какую продуктовую проблему решает: автономные сценарии запускаются одинаково в CLI, daemon и тестах.
 */
export type AutonomousBackendOptions = {
  readonly workspaceRoot: string;
  readonly workspaceName?: string;
  readonly homeDir?: string;
  readonly env?: Record<string, string | undefined>;
  readonly fetch?: FetchLike;
  readonly modelClient?: ModelClient;
  readonly logger?: AutonomousBackendLogger;
  readonly now?: () => number;
  readonly idFactory?: () => string;
};
