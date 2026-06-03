import { contentToText } from '../../../entities/model/contentToText';
import {
  type RunReflectionOutcome,
  buildRunReflectionPrompt,
  buildRunReflectionTrace,
  parseReflectionResponse
} from '../../../features/reflection/reflection';
import type { AgentRun } from '../../../shared/types/types';
import { emit } from './actions';
import type { AgentRuntimeContext } from './context';

/**
 * Что это: планирует фоновую reflection-задачу после run.
 * Зачем нужно: основной ответ не ждёт reflection, но продукт получает candidates для улучшения памяти/поведения.
 * Какую продуктовую проблему решает: агент учится на выполнении без задержки финального ответа пользователю.
 */
export function schedulePostRunReflection({
  context,
  chatId,
  runId,
  run,
  outcome
}: {
  context: AgentRuntimeContext;
  chatId: string;
  runId: string;
  run: AgentRun<unknown>;
  outcome: RunReflectionOutcome;
}): void {
  if (run.stopRequested || outcome.status === 'stopped' || context.deps.reflection?.enabled !== true) {
    return;
  }

  const schedule = context.deps.reflection.schedule || ((task: () => void) => setTimeout(task, 0));
  schedule(() => {
    void runPostRunReflection({ context, chatId, runId, run, outcome });
  });
}

/**
 * Что это: выполняет reflection model request и сохраняет найденные candidates.
 * Зачем нужно: кандидаты на улучшения появляются только если run реально дал полезный trace.
 * Какую продуктовую проблему решает: пользователю не предлагаются пустые или шумные reflection-результаты.
 */
export async function runPostRunReflection({
  context,
  chatId,
  runId,
  run,
  outcome
}: {
  context: AgentRuntimeContext;
  chatId: string;
  runId: string;
  run: AgentRun<unknown>;
  outcome: RunReflectionOutcome;
}): Promise<void> {
  const chat = await context.deps.chatRepository.getChat(chatId);
  if (!chat) {
    return;
  }

  const trace = buildRunReflectionTrace({ chat, runStartedAt: run.startedAt, task: run.prompt, outcome });
  if (!trace.tools.length && !trace.errors.length && !trace.approvalFeedback.length && !trace.changedFiles.length) {
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), context.deps.reflection?.timeoutMs || 30_000);
  try {
    const response = await context.deps.modelClient.chat(
      [
        {
          role: 'system',
          content:
            'You are AIST post-run reflection. Produce only safe JSON candidates for user review. Never call tools.'
        },
        { role: 'user', content: buildRunReflectionPrompt(trace) }
      ],
      undefined,
      chat.model,
      abortController.signal
    );
    const candidates = parseReflectionResponse(contentToText({ content: response.content }));
    if (candidates.length) {
      await context.deps.chatRepository.addReflectionCandidates?.(chatId, candidates);
      await emit({
        context,
        runId,
        event: { type: 'chat.updated', chatId, reason: 'reflection.candidates', at: context.now() }
      });
    }
  } catch (error) {
    context.deps.logger.info('Post-run reflection skipped', {
      chatId,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}
