import type { WebviewToExtensionMessage } from '../../types';
import { vscode } from '../vscode';

/**
 * Что это: единая точка отправки команд из webview в extension.
 * Зачем нужно: React-компоненты и action-группы не собирают IPC-сообщения вручную.
 * Какую проблему решает: при изменении контракта postMessage обновляется один модуль, а не весь UI.
 */
export function post({ message }: { message: WebviewToExtensionMessage }): void {
  vscode.postMessage(message);
}
