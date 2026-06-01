import { formatMemoryPromptBlock } from '../../entities/memory/memory';
import type { SubagentModelClient } from '../../shared/subagents';
import { runSubagents } from '../../shared/subagents';
import { createMemorySelectionTask } from './sources/createMemorySelectionTask';
import type { MemorySelectionInput, MemorySelectionResult } from './types';

/**
 * Что это: запускает AI-субагента, который выбирает релевантные заметки памяти перед ответом агента.
 * Зачем нужно: агент получает не просто совпадения слов, а осмысленную подборку заметок с учётом истории чата.
 */
export async function selectRelevantMemory(input: {
  selection: MemorySelectionInput;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<MemorySelectionResult> {
  const [result] = await runSubagents({
    tasks: [createMemorySelectionTask(input.selection)],
    modelClient: input.modelClient,
    signal: input.signal
  });

  return result.result || { items: [], source: 'fallback' };
}

/**
 * Что это: готовит prompt-блок памяти через AI-субагента.
 * Зачем нужно: runtime остаётся простым и получает готовый служебный блок для model context.
 */
export async function getRelevantMemoryPromptBlockBySubagent(input: {
  selection: MemorySelectionInput;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<string> {
  if (!input.selection.memoryItems.some((item) => item.enabled)) {
    return '';
  }

  const selection = await selectRelevantMemory(input);
  return formatMemoryPromptBlock(selection.items);
}
