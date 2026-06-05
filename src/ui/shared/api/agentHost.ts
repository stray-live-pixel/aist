import type { AgentHost } from './AgentHost.types';

let activeHost: AgentHost | null = null;

/**
 * Регистрирует реализацию AgentHost для текущей среды запуска.
 *
 * Каждая оболочка (web/vscode/desktop) вызывает это один раз в своём entrypoint до рендера
 * React-приложения. Так общий UI получает транспорт через явный порт, а не через хардкод.
 */
export function setAgentHost(host: AgentHost): void {
  activeHost = host;
}

/**
 * Возвращает активный AgentHost.
 *
 * Падает с понятной ошибкой, если оболочка забыла его задать: интеграционная ошибка должна быть
 * видна сразу, а не превращаться в молчаливый no-op при отправке действий.
 */
export function getAgentHost(): AgentHost {
  if (!activeHost) {
    throw new Error('AgentHost is not set. Call setAgentHost() in the shell entrypoint before rendering.');
  }

  return activeHost;
}
