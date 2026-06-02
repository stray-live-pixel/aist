import type { DaemonClientRequestMap, DaemonClientRequestMethod, DaemonEvent } from '../daemonProtocol';

/**
 * Что это: настройки подключения JSON-RPC клиента к локальному daemon socket.
 * Зачем нужно: CLI и extension используют один контракт запуска клиента.
 * Какую продуктовую проблему решает: пользовательские команды подключаются к нужному workspace-демону без дублирования путей.
 */
export type DaemonJsonRpcClientOptions = {
  readonly socketPath: string;
};

/**
 * Что это: callback для событий, которые daemon пушит активным клиентам.
 * Зачем нужно: UI и CLI могут обновляться без ручного polling.
 * Какую продуктовую проблему решает: пользователь сразу видит изменения статуса задач и autonomous-сессий.
 */
export type DaemonEventHandler = (event: DaemonEvent) => void;

/**
 * Что это: обработчик обратного JSON-RPC запроса от daemon к клиенту.
 * Зачем нужно: daemon может запросить у extension подтверждение или действие пользователя.
 * Какую продуктовую проблему решает: интерактивные сценарии работают даже когда основная логика выполняется в фоне.
 */
export type DaemonRequestHandler<Method extends DaemonClientRequestMethod = DaemonClientRequestMethod> = (
  params: DaemonClientRequestMap[Method]['params']
) => Promise<DaemonClientRequestMap[Method]['result']> | DaemonClientRequestMap[Method]['result'];
