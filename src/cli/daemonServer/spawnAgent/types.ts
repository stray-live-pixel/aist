import type { ToolRunnerSpawnAgentInput } from '../../../core/features/tool-execution/toolRunner';
import type { OpenRouterMessage } from '../../../core/shared/types/types';
import type { AistDaemonServer } from '../AistDaemonServer';

/**
 * Что это: рабочий контекст запуска универсального дочернего агента.
 * Зачем нужно: фоновой и синхронный режим используют один набор данных без копирования аргументов.
 * Какую продуктовую проблему решает: статус, модель и история субагента остаются согласованными во всех ветках выполнения.
 */
export type SpawnAgentRunContext = {
  server: AistDaemonServer;
  input: ToolRunnerSpawnAgentInput;
  runId: string;
  messages: OpenRouterMessage[];
  model: string;
  allowTools: boolean;
  startedAt: number;
};
