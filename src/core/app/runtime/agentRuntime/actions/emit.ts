import type { RuntimeEvent } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';

/**
 * Что это: пишет runtime event в repository и live event sink.
 * Зачем нужно: event timeline и realtime UI остаются синхронными.
 * Какую продуктовую проблему решает: после refresh история run совпадает с тем, что пользователь видел live.
 */
export async function emit({
  context,
  runId,
  event
}: {
  context: AgentRuntimeContext;
  runId: string;
  event: RuntimeEvent;
}): Promise<void> {
  await context.deps.runRepository?.appendEvent(runId, event);
  await context.deps.eventSink?.emit(event);
}
