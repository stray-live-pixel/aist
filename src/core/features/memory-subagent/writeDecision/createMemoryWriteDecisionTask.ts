import type { SubagentTask } from '../../../shared/subagents';
import type { OpenRouterMessage } from '../../../shared/types/types';
import type { MemoryWriteDecisionInput } from '../types';
import type { MemoryWriteDecision } from '../types/MemoryWriteDecision';
import { resolveMemorySubagentModel } from '../utils/resolveMemorySubagentModel';
import { buildMemoryWriteDecisionPrompt } from './buildMemoryWriteDecisionPrompt';
import { parseMemoryWriteDecisionResponse } from './parseMemoryWriteDecisionResponse';

const MEMORY_WRITE_DECISION_SYSTEM_PROMPT =
  'Ты безопасный субагент записи памяти AIST. Ты оцениваешь полезность заметки и отвечаешь только строгим JSON.';

/**
 * Что это: создаёт задачу AI-субагента для решения add/reject/replace.
 * Зачем нужно: каждая попытка записи памяти проходит одинаковый минималистичный фильтр полезности.
 * Какую продуктовую проблему решает: автоматическое сохранение не захламляет память и соблюдает лимит 50000 символов.
 */
export function createMemoryWriteDecisionTask(input: MemoryWriteDecisionInput): SubagentTask<MemoryWriteDecision> {
  return {
    id: 'memory.writeDecision',
    label: 'Memory write decision',
    safetyMode: 'auto',
    buildRequest: () => ({
      model: resolveMemorySubagentModel({ chatModel: input.chatModel, settings: input.settings }),
      reasoningEffort: input.settings?.reasoningEffort,
      messages: [
        { role: 'system', content: MEMORY_WRITE_DECISION_SYSTEM_PROMPT },
        { role: 'user', content: buildMemoryWriteDecisionPrompt(input) }
      ]
    }),
    parseResponse: (response: OpenRouterMessage) =>
      parseMemoryWriteDecisionResponse({ response, decisionInput: input }),
    fallback: () => ({ action: 'reject', reason: 'Субагент записи памяти недоступен.' })
  };
}
