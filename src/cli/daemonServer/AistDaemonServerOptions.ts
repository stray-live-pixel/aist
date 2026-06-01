import type { FetchLike, ModelClient } from '../../core/entities/model/modelTransport';
import type { ToolRegistry } from '../../core/features/tool-execution/toolRegistry';
import type { ToolRunnerExecutionAdapter } from '../../core/features/tool-execution/toolRunner';

/**
 * Что это: настройки запуска локального AIST daemon server.
 * Зачем нужно: CLI, тесты и extension могут подменять workspace, сеть, модели и tools.
 * Какую продуктовую проблему решает: daemon запускается одинаково в проде, e2e и unit-тестах без глобального состояния.
 */
export type AistDaemonServerOptions = {
  readonly workspaceRoot: string;
  readonly homeDir?: string;
  readonly env?: Record<string, string | undefined>;
  readonly socketPath?: string;
  readonly fetch?: FetchLike;
  readonly modelClient?: ModelClient;
  readonly toolRegistry?: ToolRegistry;
  readonly filesystemToolRunner?: ToolRunnerExecutionAdapter;
  readonly now?: () => number;
  readonly idFactory?: () => string;
};
