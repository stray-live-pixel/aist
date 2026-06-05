import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types/messages';

/**
 * Host-neutral псевдонимы транспортных сообщений общего UI.
 *
 * Формы этих union-ов уже транспорт-агностичны: это действия пользователя и события daemon,
 * а не VS Code-специфика. Псевдонимы дают новому коду host-нейтральные имена, пока внутренние
 * доменные типы постепенно переименовываются.
 */
export type UiToHostMessage = WebviewToExtensionMessage;
export type HostToUiMessage = ExtensionToWebviewMessage;

/**
 * Небольшой UI-хинт, который оболочка сохраняет между перезапусками webview
 * (например, какой чат был открыт в отдельной editor-вкладке).
 */
export type PersistedUiState = {
  chatId?: string;
};
