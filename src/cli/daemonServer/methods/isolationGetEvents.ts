import type { DaemonIsolationEventsResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord, requireString } from '../params';

export async function isolationGetEvents(
  this: AistDaemonServer,
  params: unknown
): Promise<DaemonIsolationEventsResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const sessionId = requireString({ input, key: 'sessionId' });

  return {
    operationId: this.idFactory(),
    events: await this.isolationSessions.getEvents(sessionId)
  };
}
