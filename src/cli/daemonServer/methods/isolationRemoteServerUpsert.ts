import type {
  DaemonIsolationRemoteServerUpsertResult,
  IsolationRemoteServerAuthMethod,
  IsolationRemoteServerGithubAuthMode,
  IsolationRemoteServerInput
} from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import { optionalNumber, optionalString, requireRecord, requireString } from '../params';

export async function isolationRemoteServerUpsert(
  this: AistDaemonServer,
  params: unknown
): Promise<DaemonIsolationRemoteServerUpsertResult> {
  const input = requireRecord({ value: params, label: 'params' });
  const serverInput: IsolationRemoteServerInput = {
    id: optionalString({ input, key: 'id' }),
    name: requireString({ input, key: 'name' }),
    host: requireString({ input, key: 'host' }),
    port: optionalNumber({ input, key: 'port' }),
    username: requireString({ input, key: 'username' }),
    authMethod: normalizeAuthMethod(input.authMethod),
    privateKeyPath: optionalString({ input, key: 'privateKeyPath' }),
    githubAuthMode: normalizeGithubAuthMode(input.githubAuthMode)
  };

  return {
    operationId: this.idFactory(),
    server: await this.isolationSessions.upsertRemoteServer(serverInput)
  };
}

function normalizeAuthMethod(value: unknown): IsolationRemoteServerAuthMethod {
  return value === 'ssh-key' ? 'ssh-key' : 'ssh-agent';
}

function normalizeGithubAuthMode(value: unknown): IsolationRemoteServerGithubAuthMode {
  return value === 'ssh-agent-forwarding' ? 'ssh-agent-forwarding' : 'server-existing';
}
