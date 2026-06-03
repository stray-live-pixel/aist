import type { DaemonIsolationStatusResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord, requireString } from '../params';

export async function isolationStatus(this: AistDaemonServer, params: unknown): Promise<DaemonIsolationStatusResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const sessionId = requireString({ input, key: 'sessionId' });

  return {
    operationId: this.idFactory(),
    session: this.isolationSessions.get(sessionId)
  };
}
