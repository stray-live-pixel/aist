import type { DaemonIsolationRemoteServerDeleteResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord, requireString } from '../params';

export async function isolationRemoteServerDelete(
  this: AistDaemonServer,
  params: unknown
): Promise<DaemonIsolationRemoteServerDeleteResult> {
  const input = requireRecord({ value: params, label: 'params' });
  return {
    operationId: this.idFactory(),
    deleted: await this.isolationSessions.deleteRemoteServer(requireString({ input, key: 'serverId' }))
  };
}
