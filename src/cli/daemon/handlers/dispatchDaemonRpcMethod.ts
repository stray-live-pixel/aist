import { handleAutonomousRpcMethod } from './autonomousHandlers';
import { handleChatRpcMethod } from './chatHandlers';
import { handleConfigRpcMethod } from './configHandlers';
import { handleStateRpcMethod } from './stateHandlers';
import { handleSubscriptionRpcMethod } from './subscriptionHandlers';
import type { DaemonHandlerContext } from './types';

/**
 * Что это: общий JSON-RPC dispatcher daemon по группам handlers.
 * Зачем нужно: AistDaemonServer больше не держит огромный switch всех методов.
 * Какую проблему решает: новые daemon сценарии добавляются в свою группу, а не в монолитный файл.
 */
export function dispatchDaemonRpcMethod({
  context,
  connection,
  method,
  params,
  createMethodNotFoundError
}: {
  context: DaemonHandlerContext;
  connection: unknown;
  method: string;
  params: unknown;
  createMethodNotFoundError(method: string): Error;
}): Promise<unknown> {
  const handlerResults = [
    handleSubscriptionRpcMethod({ context, connection, method }),
    handleStateRpcMethod({ context, connection, method, params }),
    handleChatRpcMethod({ context, method, params }),
    handleConfigRpcMethod({ context, method, params }),
    handleAutonomousRpcMethod({ context, method, params })
  ];
  const handled = handlerResults.find((result) => result.handled);

  if (handled?.handled) {
    return handled.result;
  }

  throw createMethodNotFoundError(method);
}
