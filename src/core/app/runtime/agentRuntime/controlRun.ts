import type { ToolApprovalDecision } from '../../../shared/types/types';
import { setActivity } from './actions';
import type { AgentRuntimeContext } from './context';

/**
 * Что это: останавливает активный run по id или первый активный run.
 * Зачем нужно: пользовательская кнопка Stop должна прервать model request и закрыть pending approvals.
 * Какую продуктовую проблему решает: агент быстро прекращает работу и не ждёт ручных решений по tools.
 */
export function stopRun({ context, runId }: { context: AgentRuntimeContext; runId?: string }): void {
  const activeRun = runId ? context.activeRunsById.get(runId) : context.activeRunsById.values().next().value;
  if (!activeRun) {
    return;
  }

  const { run, id } = activeRun;
  run.stopRequested = true;
  run.abortController.abort();
  void setActivity({
    context,
    runId: id,
    chatId: run.chatId,
    activity: 'stopping',
    detail: context.text.stopRequested()
  });
  for (const resolver of run.permissionResolvers.values()) {
    resolver({ approved: false, continueAfterDeny: false });
  }
  run.permissionResolvers.clear();
}

/**
 * Что это: передаёт решение пользователя ожидающему tool approval.
 * Зачем нужно: approval message id мапится на pending resolver внутри активных runs.
 * Какую продуктовую проблему решает: пользовательские approve/deny действия продолжают или останавливают tool flow.
 */
export function resolveToolCall({
  context,
  messageId,
  decision
}: {
  context: AgentRuntimeContext;
  messageId: string;
  decision: ToolApprovalDecision;
}): void {
  for (const activeRun of context.activeRunsById.values()) {
    const resolver = activeRun.run.permissionResolvers.get(messageId);
    if (resolver) {
      resolver(decision);
      return;
    }
  }
}
