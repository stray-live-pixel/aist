import type { DaemonIsolationRemoteServersResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';

export async function isolationRemoteServerList(
  this: AistDaemonServer
): Promise<DaemonIsolationRemoteServersResult> {
  return {
    operationId: this.idFactory(),
    servers: await this.isolationSessions.listRemoteServers()
  };
}
