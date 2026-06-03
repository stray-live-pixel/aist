import type { SubagentModelClient } from '../../shared/subagents';
import type { MemoryWriteDecisionInput } from './types';
import type { MemoryWriteDecision } from './types/MemoryWriteDecision';
import { createMemoryWriteDecisionTask } from './writeDecision/createMemoryWriteDecisionTask';

/**
 * Что это: запускает AI-субагента для решения, стоит ли записывать заметку памяти.
 * Зачем нужно: перед каждой записью проверяется польза, дубли, лимит и возможная замена старой заметки.
 * Какую продуктовую проблему решает: автоматическая память остаётся небольшой и ценной для будущих задач.
 */
export async function decideMemoryWrite(input: {
  decision: MemoryWriteDecisionInput;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<MemoryWriteDecision> {
  const task = createMemoryWriteDecisionTask(input.decision);
  const request = task.buildRequest();

  try {
    const response = await input.modelClient.chat(request.messages, undefined, request.model, input.signal);
    return task.parseResponse(response);
  } catch (error) {
    return task.fallback?.(error) || { action: 'reject', reason: 'Субагент записи памяти недоступен.' };
  }
}
