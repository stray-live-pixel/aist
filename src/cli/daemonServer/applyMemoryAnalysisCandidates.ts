import type { ChatRepository } from '../../core/entities/chat/chatRepository';
import type { AgentMemoryStore } from '../../core/entities/memory/memory';
import type { ModelClient } from '../../core/entities/model/modelTransport';
import type { MemorySubagentModelSettings } from '../../core/features/memory-subagent';
import type { AgentReflectionCandidate } from '../../core/shared/types/types';
import { applyMemoryCandidate } from './memoryAutoApply';
import { getReflectionMemoryNote, getReflectionMemoryScope } from './memorySubagentMessages';

export type ApplyMemoryAnalysisCandidatesInput = {
  chatId: string;
  candidates: AgentReflectionCandidate[];
  chatRepository: ChatRepository;
  memoryStore: AgentMemoryStore;
  modelClient: ModelClient;
  chatModel: string;
  settings: MemorySubagentModelSettings;
};

export type ApplyMemoryAnalysisCandidatesResult = {
  savedCount: number;
  rejectedCount: number;
};

/**
 * Что это: автоматически применяет candidates, найденные анализом чата.
 * Зачем нужно: кнопка анализа и фоновый анализ записывают полезные заметки без дополнительного ручного клика.
 * Какую продуктовую проблему решает: память пополняется после задачи, но каждая заметка всё равно проходит AI-фильтр полезности.
 */
export async function applyMemoryAnalysisCandidates(
  input: ApplyMemoryAnalysisCandidatesInput
): Promise<ApplyMemoryAnalysisCandidatesResult> {
  let savedCount = 0;
  let rejectedCount = 0;

  for (const candidate of input.candidates) {
    const result = await applyMemoryCandidate({
      candidate: {
        scope: getReflectionMemoryScope({ candidate }),
        note: getReflectionMemoryNote({ candidate })
      },
      memoryStore: input.memoryStore,
      modelClient: input.modelClient,
      chatModel: input.chatModel,
      settings: input.settings
    });

    if (result.memoryItem) {
      savedCount += 1;
      await input.chatRepository.setReflectionCandidateStatus(input.chatId, candidate.id, 'saved');
    } else {
      rejectedCount += 1;
      await input.chatRepository.setReflectionCandidateStatus(input.chatId, candidate.id, 'rejected');
    }
  }

  return { savedCount, rejectedCount };
}
