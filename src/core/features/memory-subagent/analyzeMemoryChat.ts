import type { SubagentModelClient } from '../../shared/subagents';
import { runSubagents } from '../../shared/subagents';
import type { AgentReflectionCandidate } from '../../shared/types/types';
import { createMemoryAnalysisTask } from './sources/createMemoryAnalysisTask';
import type { MemoryAnalysisInput } from './types';

/**
 * Что это: запускает AI-субагента, который ищет новые заметки памяти по завершённому чату.
 * Зачем нужно: пользователь получает предложения памяти по кнопке, а не автоматическое скрытое сохранение.
 */
export async function analyzeMemoryChat(input: {
  analysis: MemoryAnalysisInput;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<AgentReflectionCandidate[]> {
  const [result] = await runSubagents({
    tasks: [createMemoryAnalysisTask(input.analysis)],
    modelClient: input.modelClient,
    signal: input.signal
  });

  return result.result || [];
}
