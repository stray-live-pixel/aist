import type { DaemonIsolationRunnersResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';

export async function isolationRunners(this: AistDaemonServer): Promise<DaemonIsolationRunnersResult> {
  return {
    operationId: this.idFactory(),
    runners: await this.isolationSessions.listRunners()
  };
}
