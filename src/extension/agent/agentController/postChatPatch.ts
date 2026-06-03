import type { DaemonEvent } from '../../../cli/daemonProtocol';
import { recordPerformanceTelemetry } from '../../../core/features/performanceTelemetry';
import type { WebviewSurface } from '../types';
import { mapDaemonEventToChatPatch } from '../webview/mapDaemonEventToChatPatch';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { getSurfaces } from './getSurfaces';

/**
 * Что это: отправляет incremental chat.patch по daemon event.
 * Зачем нужно: webview может обновить одно сообщение/статус без полной перерисовки state.
 * Какую продуктовую проблему решает: streaming/tool progress выглядит быстрее и не сбрасывает UI-состояние пользователя.
 */
export function postChatPatch({
  state,
  callbacks,
  event
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  event: DaemonEvent;
}): void {
  const patch = mapDaemonEventToChatPatch(event, state.chats);
  if (!patch) return;

  state.suppressedChatStoreStateBroadcasts += 1;

  for (const surface of getPatchSurfaces({ state, callbacks, chatId: patch.chatId })) {
    const postedAt = Date.now();
    // Это горячий путь: tool/status events могут приходить десятки раз за запуск.
    // Успешную доставку не логируем, чтобы не разгонять CPU/console/output channel
    // при нескольких параллельных агентах; diagnostics сохраняем только для ошибок.
    void surface.webview.postMessage(patch).then(
      () =>
        recordPatchPostPerformance({
          state,
          surface,
          chatId: patch.chatId,
          reason: patch.reason,
          postedAt,
          status: 'success'
        }),
      (error: unknown) => {
        recordPatchPostPerformance({
          state,
          surface,
          chatId: patch.chatId,
          reason: patch.reason,
          postedAt,
          status: 'error'
        });
        state.logger.error('Failed to post chat patch to webview', error);
      }
    );
  }
}

/**
 * Что это: выбирает webview-поверхности, которым нужен patch конкретного чата.
 * Зачем нужно: editor вкладка показывает один чат и не должна ререндериться от событий соседнего агента.
 * Какую продуктовую проблему решает: три параллельных агента не умножают IPC и React-работу друг друга.
 */
export function getPatchSurfaces({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId: string;
}): WebviewSurface[] {
  return getSurfaces({ state, callbacks }).filter(
    (surface) => surface.kind === 'sidebar' || surface.getChatId() === chatId
  );
}

/**
 * Что это: фиксирует latency доставки incremental patch в webview.
 * Зачем нужно: patch-события — горячий путь tool/status progress, и их замедление напрямую лагает UI.
 * Какую продуктовую проблему решает: можно отличить медленный агент от медленной доставки обновлений чата.
 */
function recordPatchPostPerformance({
  state,
  surface,
  chatId,
  reason,
  postedAt,
  status
}: {
  state: AgentControllerState;
  surface: WebviewSurface;
  chatId: string;
  reason?: string;
  postedAt: number;
  status: 'success' | 'error';
}): void {
  recordPerformanceTelemetry({
    operation: 'webview.patch',
    extensionVersion: String(state.context.extension.packageJSON?.version || '0.0.0'),
    workspaceRoot: state.daemonRuntime.workspaceRoot,
    chatId,
    surfaceId: surface.id,
    surfaceKind: surface.kind,
    startedAt: postedAt,
    finishedAt: Date.now(),
    status,
    reason
  });
}
