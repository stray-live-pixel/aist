import type { AgentMemoryCandidate, AgentMemoryItem, AgentMemoryStore } from '../../core/entities/memory/memory';
import type { ModelClient } from '../../core/entities/model/modelTransport';
import { type MemorySubagentModelSettings, decideMemoryWrite } from '../../core/features/memory-subagent';

export type ApplyMemoryCandidateInput = {
  candidate: AgentMemoryCandidate;
  memoryStore: AgentMemoryStore;
  modelClient: ModelClient;
  chatModel: string;
  settings: MemorySubagentModelSettings;
};

export type ApplyMemoryCandidateResult = {
  memoryItem?: AgentMemoryItem;
  decisionAction: 'add' | 'replace' | 'reject';
  reason?: string;
};

/**
 * Что это: применяет одну новую заметку памяти через AI-фильтр полезности.
 * Зачем нужно: и ручная кнопка, и автопамять используют один путь add/reject/replace.
 * Какую продуктовую проблему решает: память не захламляется дублями и соблюдает лимит 50000 символов.
 */
export async function applyMemoryCandidate(input: ApplyMemoryCandidateInput): Promise<ApplyMemoryCandidateResult> {
  const decision = await decideMemoryWrite({
    decision: {
      candidate: input.candidate,
      memoryItems: input.memoryStore.list(),
      chatModel: input.chatModel,
      settings: input.settings
    },
    modelClient: input.modelClient
  });

  if (decision.action === 'reject') {
    return { decisionAction: 'reject', reason: decision.reason };
  }

  const memoryItem =
    decision.action === 'replace'
      ? await input.memoryStore.replace({
          candidate: { scope: decision.scope, note: decision.note, importance: decision.importance },
          replaceItemId: decision.replaceItemId
        })
      : await input.memoryStore.add({ scope: decision.scope, note: decision.note, importance: decision.importance });

  return { memoryItem, decisionAction: decision.action, reason: decision.reason };
}
