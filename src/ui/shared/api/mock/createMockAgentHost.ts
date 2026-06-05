import type { AgentHost } from '../AgentHost.types';
import type { HostToUiMessage, PersistedUiState, UiToHostMessage } from '../hostMessages';

export type MockAgentHost = AgentHost & {
  /** Все действия, отправленные UI, — для проверок в тестах. */
  readonly posted: UiToHostMessage[];
  /** Проиграть входящее сообщение хоста (snapshot/patch/событие) подписчикам. */
  emit(message: HostToUiMessage): void;
};

export type MockAgentHostOptions = {
  /** Сообщения, которые хост «пришлёт» сразу после подписки, например первый state snapshot. */
  initialMessages?: HostToUiMessage[];
  /** Колбэк на каждое отправленное действие — удобно для assert-ов в web e2e. */
  onPost?: (message: UiToHostMessage) => void;
};

/**
 * In-memory AgentHost для Storybook и web e2e на моках.
 *
 * Не ходит в сеть: записывает отправленные действия в posted и проигрывает заранее заданные
 * входящие сообщения. Позволяет тестировать общий UI без реального daemon и без конкретной
 * среды запуска.
 */
export function createMockAgentHost(options: MockAgentHostOptions = {}): MockAgentHost {
  const posted: UiToHostMessage[] = [];
  const listeners = new Set<(message: HostToUiMessage) => void>();
  let persisted: PersistedUiState | undefined;

  function emit(message: HostToUiMessage): void {
    for (const listener of listeners) {
      listener(message);
    }
  }

  return {
    posted,
    emit,
    postMessage(message) {
      posted.push(message);
      options.onPost?.(message);
    },
    subscribe(listener) {
      listeners.add(listener);
      for (const message of options.initialMessages ?? []) {
        listener(message);
      }

      return () => {
        listeners.delete(listener);
      };
    },
    getPersistedState() {
      return persisted;
    },
    setPersistedState(state) {
      persisted = state;
    }
  };
}
