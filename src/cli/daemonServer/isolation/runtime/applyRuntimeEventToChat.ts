import type { ChatMessage, RuntimeEvent } from '../../../../core/shared/types/types';
import type { AistDaemonServer } from '../../AistDaemonServer';

/**
 * Что это: переносит runtime event из автономного контейнера в локальный chat repository.
 * Зачем нужно: контейнер пишет JSONL-события по stdout, а VS Code должен видеть обычный живой чат без доступа к файловой системе контейнера.
 * Какую продуктовую проблему решает: isolated agent можно запускать на другом Docker/сервере, сохраняя наблюдаемость в локальном UI.
 */
export async function applyRuntimeEventToChat({
  server,
  event,
  localChatId
}: {
  server: AistDaemonServer;
  event: RuntimeEvent;
  localChatId: string;
}): Promise<RuntimeEvent> {
  const localEvent = rebindRuntimeEventChat({ event, chatId: localChatId });
  await persistRuntimeEventChatState({ server, event: localEvent });
  return localEvent;
}

/**
 * Что это: заменяет chatId контейнерного CLI на chatId локальной isolation-сессии.
 * Зачем нужно: контейнерный чат живёт внутри контейнера, а UI подписан на локальный чат daemon.
 * Какую продуктовую проблему решает: события из remote/self-contained runtime попадают в правильную карточку чата пользователя.
 */
function rebindRuntimeEventChat({ event, chatId }: { event: RuntimeEvent; chatId: string }): RuntimeEvent {
  switch (event.type) {
    case 'run.started':
    case 'run.completed':
    case 'run.finished':
      return { ...event, run: { ...event.run, chatId } };
    default:
      return { ...event, chatId };
  }
}

/**
 * Что это: применяет минимальные изменения runtime event к локальному chat repository.
 * Зачем нужно: broadcast event обновляет webview, но после reconnect state читается из файлового источника правды.
 * Какую продуктовую проблему решает: пользователь не теряет сообщения isolated агента при закрытии/открытии VS Code.
 */
async function persistRuntimeEventChatState({
  server,
  event
}: {
  server: AistDaemonServer;
  event: RuntimeEvent;
}): Promise<void> {
  const chatId = getRuntimeEventChatId({ event });
  if (!chatId) {
    return;
  }

  if (event.type === 'message.appended') {
    await server.chatRepository.appendMessage(chatId, event.message as ChatMessage);
    return;
  }

  if (event.type === 'tool.call.completed') {
    await server.chatRepository.updateMessage(chatId, event.messageId, {
      status: event.result.ok === false ? 'error' : 'done',
      reason: event.toolCall.reason,
      nextStep: event.toolCall.nextStep,
      args: event.toolCall.args,
      result: event.result,
      modelResult: event.modelResult
    });
    return;
  }

  if (event.type === 'tool.call.failed' && event.messageId) {
    await server.chatRepository.updateMessage(chatId, event.messageId, {
      status: 'error',
      reason: event.toolCall.reason,
      nextStep: event.toolCall.nextStep,
      args: event.toolCall.args,
      result: { ok: false, error: event.error.message, code: event.error.code }
    });
    return;
  }

  if (event.type === 'model.request.updated') {
    await server.chatRepository.setModelRequest(chatId, event.request);
    return;
  }

  if (event.type === 'run.activity') {
    await server.chatRepository.setActivity(chatId, event.activity, event.detail);
    return;
  }

  if (event.type === 'run.completed') {
    await server.chatRepository.setLastAnswer(chatId, event.answer);
    return;
  }

  if (event.type === 'run.finished') {
    if (event.answer) {
      await server.chatRepository.setLastAnswer(chatId, event.answer);
    }
    await server.chatRepository.setActivity(chatId, 'idle', undefined);
    await server.chatRepository.setBusy(chatId, false);
  }
}

/**
 * Что это: извлекает chatId из runtime event без зависимости от private daemon helper.
 * Зачем нужно: импорт контейнерных событий живёт в isolation/runtime слое.
 * Какую продуктовую проблему решает: синхронизация чата остаётся компактной и не тянет монолитные daemon methods.
 */
function getRuntimeEventChatId({ event }: { event: RuntimeEvent }): string | undefined {
  switch (event.type) {
    case 'run.started':
    case 'run.completed':
    case 'run.finished':
      return event.run.chatId;
    case 'chat.updated':
      return event.chatId;
    default:
      return event.chatId;
  }
}
