import type { AgentMemoryCandidate } from '../../../entities/memory/memory';
import type { ToolApprovalDecision } from '../../../shared/types/types';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';

/**
 * Что это: сохраняет rememberGlobal/rememberProject из approval decision.
 * Зачем нужно: пользовательские правила approval становятся памятью агента.
 * Какую продуктовую проблему решает: повторные похожие approvals требуют меньше ручных действий.
 */
export async function saveApprovalMemory({
  runtime,
  decision
}: {
  runtime: ToolRunnerRuntime;
  decision: ToolApprovalDecision;
}): Promise<void> {
  const candidates = [
    decision.rememberGlobal ? { scope: 'global' as const, note: decision.rememberGlobal } : undefined,
    decision.rememberProject ? { scope: 'project' as const, note: decision.rememberProject } : undefined
  ].filter((candidate): candidate is AgentMemoryCandidate => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await runtime.deps.memory?.add(candidate);
    } catch (error) {
      console.error('[aist] Failed to save approval memory', error);
    }
  }
}
