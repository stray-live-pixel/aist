import { getAgentHost } from '../../api/agentHost';
import type { WebviewToExtensionMessage } from '../../types';

/**
 * Что это: единая точка отправки команд из общего UI в хост.
 * Зачем нужно: React-компоненты и action-группы не собирают транспорт вручную.
 * Какую проблему решает: при смене среды запуска (web/vscode/desktop) меняется только AgentHost,
 * а не весь UI.
 */
export function post({ message }: { message: WebviewToExtensionMessage }): void {
  getAgentHost().postMessage(message);
}
