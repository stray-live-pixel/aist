import type { DaemonIsolationStartParams, DaemonIsolationStartResult } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { requireRecord } from '../params';

export async function isolationStart(this: AistDaemonServer, params: unknown): Promise<DaemonIsolationStartResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const prompt = typeof input.prompt === 'string' ? input.prompt : '';
  const flowId = typeof input.flowId === 'string' ? input.flowId : undefined;
  const baseRef = typeof input.baseRef === 'string' ? input.baseRef : undefined;
  const provider = input.provider === 'remote-server' || input.provider === 'docker-local' ? input.provider : undefined;
  const runnerId = typeof input.runnerId === 'string' ? input.runnerId : undefined;
  const session = await this.isolationSessions.start({
    prompt,
    flowId,
    baseRef,
    provider,
    runnerId
  } satisfies DaemonIsolationStartParams);

  return {
    operationId: this.idFactory(),
    accepted: true,
    session
  };
}
