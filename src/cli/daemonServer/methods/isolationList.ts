import type { DaemonIsolationListResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';

export async function isolationList(this: AistDaemonServer): Promise<DaemonIsolationListResult> {
  return {
    operationId: this.idFactory(),
    sessions: this.isolationSessions.list()
  };
}
