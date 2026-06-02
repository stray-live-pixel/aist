import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { getTelemetryRunId } from './getTelemetryRunId';
import type { ToolRunnerHandleParams } from './types';

/**
 * Что это: определяет runId для событий и repository.
 * Зачем нужно: caller может передать runId явно, через deps.getRunId или legacy telemetry.runId.
 * Какую продуктовую проблему решает: tool lifecycle привязан к правильному run timeline.
 */
export function getRunId({
  runtime,
  params
}: {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
}): string | undefined {
  return params.runId || runtime.deps.getRunId?.(params.run) || getTelemetryRunId({ telemetry: params.run.telemetry });
}
