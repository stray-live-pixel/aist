import { DaemonJsonRpcClient } from '../daemonClient';
import { type DaemonAutonomousStopResult, getDaemonSocketPath } from '../daemonProtocol';

export async function tryStopAutonomousSessionViaDaemon(
  workspaceRoot: string,
  sessionId: string
): Promise<DaemonAutonomousStopResult | undefined> {
  let client: DaemonJsonRpcClient | undefined;
  try {
    client = await DaemonJsonRpcClient.connect({ socketPath: getDaemonSocketPath(workspaceRoot) });
    return await client.request<DaemonAutonomousStopResult>('autonomous.stop', { sessionId });
  } catch {
    return undefined;
  } finally {
    client?.close();
  }
}
