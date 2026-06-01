import type { AgentRun } from '../../../shared/types/types';
import type { RuntimeErrorInfo } from '../../../shared/types/types';
import { createRunId, hasActiveRun, requireChat } from './actions';
import type { AgentRuntimeContext } from './context';
import type { AgentRuntimeAskOptions } from './types';

/**
 * Что это: результат принятого run вместе с promise его фонового выполнения.
 * Зачем нужно: ask ждёт done, а startAsk возвращает runId сразу и оставляет выполнение в фоне.
 * Какую продуктовую проблему решает: CLI и UI используют один acceptance flow без дублирования.
 */
export type AcceptedRun =
  | { accepted: true; runId: string; done: Promise<void> }
  | { accepted: false; error: RuntimeErrorInfo };

/**
 * Что это: валидирует prompt/chat, создаёт run и регистрирует active state.
 * Зачем нужно: busy checks и telemetry должны выполниться до запуска тяжёлого model loop.
 * Какую продуктовую проблему решает: пользователь получает быстрый отказ для пустого/busy запроса.
 */
export async function acceptRun({
  context,
  chatId,
  prompt,
  execute
}: {
  context: AgentRuntimeContext;
  chatId: string;
  prompt: string;
  options: AgentRuntimeAskOptions;
  execute(input: { chatId: string; runId: string; run: AgentRun<unknown>; cleanPrompt: string }): Promise<void>;
}): Promise<AcceptedRun> {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) {
    return { accepted: false, error: { message: 'Prompt is empty.', code: 'run.emptyPrompt' } };
  }

  const chat = await requireChat({ context, chatId });
  if (chat.busy || hasActiveRun({ context, chatId: chat.id })) {
    context.deps.logger.info('Rejecting ask because chat is busy', { chatId: chat.id });
    return { accepted: false, error: { message: 'Chat already has an active run.', code: 'run.busy' } };
  }

  const startedAt = context.now();
  const runId = await createRunId({ context, chat, prompt: cleanPrompt, startedAt });
  const run: AgentRun<unknown> = {
    chatId: chat.id,
    startedAt,
    prompt: cleanPrompt,
    abortController: new AbortController(),
    stopRequested: false,
    permissionResolvers: new Map(),
    telemetry: context.deps.telemetry?.createRun?.(chat, startedAt, runId)
  };
  const activeRun = { id: runId, chatId: chat.id, run };
  context.activeRunsByChat.set(chat.id, activeRun);
  context.activeRunsById.set(runId, activeRun);

  return {
    accepted: true,
    runId,
    done: scheduleRunExecution({ task: () => execute({ chatId: chat.id, runId, run, cleanPrompt }) })
  };
}

function scheduleRunExecution({ task }: { task: () => Promise<void> }): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      void task().then(resolve, reject);
    }, 0);
  });
}
