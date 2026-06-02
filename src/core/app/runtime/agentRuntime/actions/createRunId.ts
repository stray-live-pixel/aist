import type { Chat } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';

/**
 * Что это: создаёт run id через repository или локальный idFactory.
 * Зачем нужно: persisted run получает id от storage, а lightweight окружения работают без storage.
 * Какую продуктовую проблему решает: stop/approval/events всегда имеют стабильный runId.
 */
export async function createRunId({
  context,
  chat,
  prompt,
  startedAt
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  prompt: string;
  startedAt: number;
}): Promise<string> {
  if (!context.deps.runRepository) {
    return context.idFactory();
  }

  const run = await context.deps.runRepository.create({
    chatId: chat.id,
    prompt,
    model: chat.model,
    status: 'running',
    startedAt
  });
  return run.id;
}
