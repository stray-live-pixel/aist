import type { DaemonHandlerContext, DaemonHandlerResult } from './types';

export function handleIsolationRpcMethod({
  context,
  method,
  params
}: {
  context: DaemonHandlerContext;
  method: string;
  params: unknown;
}): DaemonHandlerResult {
  const methodMap: Record<string, string> = {
    'isolation.list': 'isolationList',
    'isolation.runners': 'isolationRunners',
    'isolation.remoteServers.list': 'isolationRemoteServerList',
    'isolation.remoteServers.upsert': 'isolationRemoteServerUpsert',
    'isolation.remoteServers.delete': 'isolationRemoteServerDelete',
    'isolation.start': 'isolationStart',
    'isolation.continue': 'isolationContinue',
    'isolation.status': 'isolationStatus',
    'isolation.stop': 'isolationStop',
    'isolation.destroy': 'isolationDestroy',
    'isolation.getEvents': 'isolationGetEvents'
  };
  const handlerName = methodMap[method];

  return handlerName ? { handled: true, result: context.call(handlerName, params) } : { handled: false };
}
