import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import { recordPerformanceTelemetry } from '../../../../core/features/performanceTelemetry';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: завершает performance-замер agent request по финальному daemon event.
 * Зачем нужно: chat.ask возвращает runId быстро, а реальная длительность запроса заканчивается на run.finished/error.
 * Какую продуктовую проблему решает: пользователь видит честную скорость работы агента, а не только latency RPC.
 */
export function recordAgentRequestPerformanceFromEvent({
  context,
  event
}: {
  context: BridgeRuntimeContext;
  event: DaemonEvent;
}): void {
  const runId = getRunId({ event });
  if (!runId || !isFinalRunEvent({ event })) {
    return;
  }

  const started = context.state.agentRequestStartedAtByRunId.get(runId);
  if (!started) {
    return;
  }

  context.state.agentRequestStartedAtByRunId.delete(runId);
  recordPerformanceTelemetry({
    operation: 'agent.request',
    extensionVersion: started.extensionVersion,
    workspaceRoot: started.workspaceRoot,
    chatId: started.chatId,
    startedAt: started.startedAt,
    finishedAt: getEventFinishedAt({ event }),
    status: getStatus({ event }),
    reason: event.type,
    meta: { runId }
  });
}

function getEventFinishedAt({ event }: { event: DaemonEvent }): number {
  return 'at' in event && typeof event.at === 'number' ? event.at : Date.now();
}

function getRunId({ event }: { event: DaemonEvent }): string | undefined {
  if ('run' in event && event.run?.id) return event.run.id;
  if ('runId' in event && typeof event.runId === 'string') return event.runId;
  return undefined;
}

function isFinalRunEvent({ event }: { event: DaemonEvent }): boolean {
  return (
    event.type === 'run.finished' ||
    event.type === 'run.error' ||
    event.type === 'run.failed' ||
    event.type === 'run.stopped'
  );
}

function getStatus({ event }: { event: DaemonEvent }): 'success' | 'error' | 'stopped' {
  if (event.type === 'run.finished') {
    return event.status === 'stopped' ? 'stopped' : 'success';
  }

  if (event.type === 'run.stopped') {
    return 'stopped';
  }

  return 'error';
}
