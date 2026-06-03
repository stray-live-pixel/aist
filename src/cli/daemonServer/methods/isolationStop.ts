import type { DaemonIsolationStopResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord, requireString } from '../params';

export async function isolationStop(this: AistDaemonServer, params: unknown): Promise<DaemonIsolationStopResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const sessionId = requireString({ input, key: 'sessionId' });

  return {
    operationId: this.idFactory(),
    session: await this.isolationSessions.stop(sessionId)
  };
}
