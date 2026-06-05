import type { HostToUiMessage, PersistedUiState, UiToHostMessage } from './hostMessages';

/**
 * AgentHost — единственный порт между общим UI и средой запуска (web, VS Code, desktop).
 *
 * Среда создаёт реализацию и регистрирует её через setAgentHost() до рендера. Благодаря этому
 * общий UI не знает про vscode API, fetch или конкретный транспорт: он только отправляет действия
 * и подписывается на входящие снапшоты/патчи/события.
 */
export interface AgentHost {
  /** Отправить действие пользователя/UI в хост; daemon выполнит его. */
  postMessage(message: UiToHostMessage): void;
  /** Подписаться на входящие сообщения хоста (state snapshot, chat.patch, события). Возвращает отписку. */
  subscribe(listener: (message: HostToUiMessage) => void): () => void;
  /** Прочитать сохранённый UI-хинт (например, активный chatId редактора). */
  getPersistedState(): PersistedUiState | undefined;
  /** Сохранить UI-хинт между перезапусками webview. */
  setPersistedState(state: PersistedUiState): void;
}
