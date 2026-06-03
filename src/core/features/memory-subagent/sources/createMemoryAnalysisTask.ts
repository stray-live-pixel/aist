import { contentToText } from '../../../entities/model/contentToText';
import type { SubagentTask } from '../../../shared/subagents';
import { parseJsonObject } from '../../../shared/subagents/utils/parseJsonObject';
import type { AgentReflectionCandidate, OpenRouterMessage } from '../../../shared/types/types';
import { validateReflectionCandidates } from '../../reflection/reflection';
import type { MemoryAnalysisInput } from '../types';
import { resolveMemorySubagentModel } from '../utils/resolveMemorySubagentModel';
import { buildMemoryAnalysisPrompt } from './buildMemoryAnalysisPrompt';

const MEMORY_ANALYSIS_SYSTEM_PROMPT =
  'Ты безопасный субагент памяти AIST. Ты только предлагаешь user-reviewable кандидаты памяти и отвечаешь строгим JSON.';

/**
 * Что это: создает задачу субагента для анализа чата на новые заметки.
 * Зачем нужно: ручной запуск анализа использует ту же shared-механику, что и подбор памяти перед запросом.
 */
export function createMemoryAnalysisTask(input: MemoryAnalysisInput): SubagentTask<AgentReflectionCandidate[]> {
  return {
    id: 'memory.analysis',
    label: 'Memory analysis',
    safetyMode: 'requiresApproval',
    buildRequest: () => ({
      model: resolveMemorySubagentModel({ chatModel: input.chatModel, settings: input.settings }),
      reasoningEffort: input.settings?.reasoningEffort,
      messages: [
        { role: 'system', content: MEMORY_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: buildMemoryAnalysisPrompt(input) }
      ]
    }),
    parseResponse: parseMemoryAnalysisResponse,
    fallback: () => []
  };
}

/**
 * Что это: валидирует кандидаты, которые предложила модель.
 * Зачем нужно: даже ручной запуск анализа не должен сохранять небезопасные или мусорные заметки.
 */
function parseMemoryAnalysisResponse(response: OpenRouterMessage): AgentReflectionCandidate[] {
  const parsed = parseJsonObject({ content: contentToText({ content: response.content }) });
  return validateReflectionCandidates(Array.isArray(parsed?.candidates) ? parsed.candidates : []);
}
