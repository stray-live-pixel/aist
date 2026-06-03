import type { DaemonIsolationStartResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord, requireString } from '../params';

export async function isolationContinue(this: AistDaemonServer, params: unknown): Promise<DaemonIsolationStartResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const sessionId = requireString({ input, key: 'sessionId' });
  const prompt = requireString({ input, key: 'prompt' });
  const session = await this.isolationSessions.continue(sessionId, prompt);

  return {
    operationId: this.idFactory(),
    accepted: true,
    session
  };
}
