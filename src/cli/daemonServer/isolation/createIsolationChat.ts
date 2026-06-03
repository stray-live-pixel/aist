import type { ChatModelSettings } from '../../../core/shared/types/types';
import type { AistDaemonServer } from '../AistDaemonServer';
import { createIsolationChatTitle } from './createIsolationChatTitle';

/**
 * Что это: создаёт persisted чат для isolated Docker-сессии.
 * Зачем нужно: detached runtime пишет все сообщения, tool-calls и статусы в обычное chat-хранилище.
 * Какую продуктовую проблему решает: пользователь наблюдает isolated агента в стандартном webview-чате, а не в кастомном логе.
 */
export async function createIsolationChat({
  server,
  chatId,
  prompt,
  modelSettings
}: {
  server: AistDaemonServer;
  chatId: string;
  prompt: string;
  modelSettings: ChatModelSettings;
}): Promise<void> {
  await server.chatRepository.create({
    id: chatId,
    title: createIsolationChatTitle({ prompt }),
    model: modelSettings.model,
    modelSettings,
    messages: [
      {
        role: 'status',
        content: 'Isolated Docker agent session created. Open this chat to watch the agent work in the container.'
      }
    ],
    state: {
      activityDetail: 'Waiting for isolated Docker environment.'
    }
  });
}
