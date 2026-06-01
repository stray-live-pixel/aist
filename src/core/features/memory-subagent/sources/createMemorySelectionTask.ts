import type { AgentMemoryItem } from '../../../entities/memory/memory';
import type { SubagentTask } from '../../../shared/subagents';
import { parseJsonObject } from '../../../shared/subagents/utils/parseJsonObject';
import type { OpenRouterMessage } from '../../../shared/types/types';
import type { MemorySelectionInput, MemorySelectionResult } from '../types';
import { resolveMemorySubagentModel } from '../utils/resolveMemorySubagentModel';
import { buildMemorySelectionPrompt } from './buildMemorySelectionPrompt';
import { selectFallbackMemory } from './selectFallbackMemory';

const MEMORY_SELECTION_SYSTEM_PROMPT =
  'Ты безопасный субагент памяти AIST. Ты только выбираешь релевантные user-approved заметки и отвечаешь строгим JSON.';

/**
 * Что это: создает shared-задачу субагента для подбора памяти.
 * Зачем нужно: общий runner может запускать этот анализ параллельно с другими будущими помощниками.
 */
export function createMemorySelectionTask(input: MemorySelectionInput): SubagentTask<MemorySelectionResult> {
  return {
    id: 'memory.selection',
    label: 'Memory selection',
    safetyMode: 'auto',
    buildRequest: () => ({
      model: resolveMemorySubagentModel({ chatModel: input.chatModel, settings: input.settings }),
      reasoningEffort: input.settings?.reasoningEffort,
      messages: [
        { role: 'system', content: MEMORY_SELECTION_SYSTEM_PROMPT },
        { role: 'user', content: buildMemorySelectionPrompt(input) }
      ]
    }),
    parseResponse: (response) => parseMemorySelectionResponse({ response, memoryItems: input.memoryItems }),
    fallback: () => ({
      items: selectFallbackMemory({ prompt: input.prompt, items: input.memoryItems }),
      source: 'fallback'
    })
  };
}

/**
 * Что это: переводит JSON-ответ модели в список сохранённых заметок.
 * Зачем нужно: модель выбирает id, но source of truth остаётся в локальном хранилище памяти.
 */
function parseMemorySelectionResponse(input: {
  response: OpenRouterMessage;
  memoryItems: AgentMemoryItem[];
}): MemorySelectionResult {
  const parsed = parseJsonObject({ content: input.response.content || '' });
  const selectedIds = Array.isArray(parsed?.selectedIds) ? parsed.selectedIds.map((id) => String(id)).slice(0, 6) : [];
  const selected = selectedIds
    .map((id) => input.memoryItems.find((item) => item.enabled && item.id === id))
    .filter((item): item is AgentMemoryItem => Boolean(item));

  return {
    items: selected,
    reason: typeof parsed?.reason === 'string' ? parsed.reason : undefined,
    source: 'ai'
  };
}
