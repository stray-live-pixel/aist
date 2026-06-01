import type { DaemonHandlerContext, DaemonHandlerResult } from './types';

/**
 * Что это: маршрутизатор JSON-RPC подписок на события daemon.
 * Зачем нужно: event subscription — отдельный пользовательский сценарий от чтения state.
 * Какую проблему решает: будущие subscription-возможности можно добавлять без правок state handlers.
 */
export function handleSubscriptionRpcMethod({
  context,
  connection,
  method
}: {
  context: DaemonHandlerContext;
  connection: unknown;
  method: string;
}): DaemonHandlerResult {
  switch (method) {
    case 'events.subscribe':
      return { handled: true, result: context.call('eventsSubscribe', connection, true) };
    case 'events.unsubscribe':
      return { handled: true, result: context.call('eventsSubscribe', connection, false) };
    default:
      return { handled: false };
  }
}
