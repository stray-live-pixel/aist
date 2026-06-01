import type { ChatMessage } from '../../../../shared/types/types';
import type { AgentRuntimeContext } from '../context';
import { toRuntimeChatMessage } from '../toRuntimeChatMessage';
import { emit } from './emit';

/**
 * Что это: добавляет сообщение в чат и отправляет runtime event.
 * Зачем нужно: storage и live-подписчики должны видеть одно и то же новое сообщение.
 * Какую продуктовую проблему решает: webview обновляется сразу, а история остаётся persistable.
 */
export async function appendMessage({
  context,
  runId,
  chatId,
  message
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  message: Omit<ChatMessage, 'id' | 'createdAt'>;
}): Promise<ChatMessage> {
  const nextMessage = await context.deps.chatRepository.appendMessage(chatId, message);
  await emit({
    context,
    runId,
    event: {
      type: 'message.appended',
      chatId,
      message: toRuntimeChatMessage({ message: nextMessage }),
      at: context.now()
    }
  });
  return nextMessage;
}
