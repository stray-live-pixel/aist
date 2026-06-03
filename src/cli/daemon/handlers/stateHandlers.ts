import type { DaemonHandlerContext, DaemonHandlerResult } from './types';

/**
 * Что это: маршрутизатор служебных JSON-RPC методов состояния и подписок.
 * Зачем нужно: initialize/state/events/capabilities отделены от продуктовых chat/config handlers.
 * Какую проблему решает: lifecycle daemon читается отдельно от бизнес-команд агента.
 */
export function handleStateRpcMethod({
  context,
  connection,
  method,
  params
}: {
  context: DaemonHandlerContext;
  connection: unknown;
  method: string;
  params: unknown;
}): DaemonHandlerResult {
  switch (method) {
    case 'initialize':
      return { handled: true, result: context.call('initializeMethod') };
    case 'daemon.shutdown':
      return { handled: true, result: context.call('daemonShutdown') };
    case 'state.get':
      return { handled: true, result: context.call('stateGet') };
    case 'events.subscribe':
      return { handled: true, result: context.call('eventsSubscribe', connection, true) };
    case 'events.unsubscribe':
      return { handled: true, result: context.call('eventsSubscribe', connection, false) };
    case 'client.capabilities':
      return { handled: true, result: context.call('clientCapabilities', connection, params) };
    default:
      return { handled: false };
  }
}
