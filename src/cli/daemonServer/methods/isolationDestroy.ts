import type { DaemonIsolationDestroyResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord, requireString } from '../params';

export async function isolationDestroy(this: AistDaemonServer, params: unknown): Promise<DaemonIsolationDestroyResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const sessionId = requireString({ input, key: 'sessionId' });

  return {
    operationId: this.idFactory(),
    session: await this.isolationSessions.destroy(sessionId)
  };
}
