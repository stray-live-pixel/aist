import type { AgentRun, Chat } from '../../../shared/types/types';
import { appendMessage, createRunSnapshot, emit, setActivity } from './actions';
import { attachActivityStream } from './attachActivityStream';
import type { AgentRuntimeContext } from './context';
import type { AgentRuntimeAskOptions } from './types';

/**
 * Что это: переводит чат и run в состояние активного запуска.
 * Зачем нужно: перед подготовкой истории нужно зафиксировать busy, стартовое событие и user message.
 * Какую продуктовую проблему решает: UI сразу видит, что запрос принят и агент начал думать.
 */
export async function startRun({
  context,
  chat,
  runId,
  run,
  prompt,
  options
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  runId: string;
  run: AgentRun<unknown>;
  prompt: string;
  options: AgentRuntimeAskOptions;
}): Promise<void> {
  context.deps.logger.info('Agent run started', {
    chatId: chat.id,
    runId,
    promptLength: prompt.length,
    skipUserMessage: options.skipUserMessage === true
  });
  await context.deps.chatRepository.setModelRequest(chat.id, undefined);
  await context.deps.chatRepository.setBusy(chat.id, true);
  await emit({
    context,
    runId,
    event: {
      type: 'run.started',
      run: createRunSnapshot({ context, runId, chat, run, status: 'running' }),
      at: context.now()
    }
  });
  if (!options.skipUserMessage) {
    await appendMessage({
      context,
      runId,
      chatId: chat.id,
      message: { role: 'user', content: prompt, attachments: options.attachments }
    });
  }
  await setActivity({ context, runId, chatId: chat.id, activity: 'thinking', detail: context.text.prepareRequest() });
  attachActivityStream({ context, chatId: chat.id, runId, run });
}
