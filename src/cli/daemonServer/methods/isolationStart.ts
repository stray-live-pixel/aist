import type { DaemonIsolationStartParams, DaemonIsolationStartResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord } from '../params';

export async function isolationStart(this: AistDaemonServer, params: unknown): Promise<DaemonIsolationStartResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const prompt = typeof input.prompt === 'string' ? input.prompt : '';
  const baseRef = typeof input.baseRef === 'string' ? input.baseRef : undefined;
  const provider = input.provider === 'docker-local' ? 'docker-local' : undefined;
  const session = await this.isolationSessions.start({
    prompt,
    baseRef,
    provider
  } satisfies DaemonIsolationStartParams);

  return {
    operationId: this.idFactory(),
    accepted: true,
    session
  };
}
