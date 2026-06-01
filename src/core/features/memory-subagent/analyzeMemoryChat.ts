import type { SubagentModelClient } from '../../shared/subagents';
import type { AgentReflectionCandidate, OpenRouterMessage } from '../../shared/types/types';
import { createMemoryAnalysisTask } from './sources/createMemoryAnalysisTask';
import type { MemoryAnalysisInput } from './types';

export type MemoryChatAnalysisResult = {
  candidates: AgentReflectionCandidate[];
  model: string;
  history: OpenRouterMessage[];
  response?: OpenRouterMessage;
  error?: string;
};

/**
 * Что это: запускает AI-субагента, который ищет новые заметки памяти по завершённому чату.
 * Зачем нужно: пользователь получает предложения памяти по кнопке, а не автоматическое скрытое сохранение.
 */
export async function analyzeMemoryChat(input: {
  analysis: MemoryAnalysisInput;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<AgentReflectionCandidate[]> {
  const result = await analyzeMemoryChatDetailed(input);
  return result.candidates;
}

/**
 * Что это: запускает memory-субагента и возвращает полную модельную историю single-call запуска.
 * Зачем нужно: persisted SubagentRun показывает пользователю, какой prompt ушёл в дочернюю модель и какой JSON вернулся.
 */
export async function analyzeMemoryChatDetailed(input: {
  analysis: MemoryAnalysisInput;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<MemoryChatAnalysisResult> {
  const task = createMemoryAnalysisTask(input.analysis);
  const request = task.buildRequest();

  try {
    const response = await input.modelClient.chat(request.messages, undefined, request.model, input.signal);
    return {
      candidates: task.parseResponse(response),
      model: request.model,
      history: [...request.messages, response],
      response
    };
  } catch (error) {
    if (!task.fallback) {
      throw error;
    }

    return {
      candidates: task.fallback(error),
      model: request.model,
      history: request.messages,
      error: getErrorMessage({ error })
    };
  }
}

/**
 * Что это: приводит любую ошибку memory-субагента к короткому тексту.
 * Зачем нужно: SubagentRun хранит понятную причину сбоя или fallback без нестабильных Error-like объектов.
 */
function getErrorMessage(input: { error: unknown }): string {
  return input.error instanceof Error ? input.error.message : String(input.error);
}
