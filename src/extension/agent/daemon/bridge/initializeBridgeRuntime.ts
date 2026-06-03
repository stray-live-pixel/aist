import { DAEMON_PROTOCOL_VERSION, type DaemonInitializeResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { createBridgeChat } from './createBridgeChat';
import { getBridgeClient } from './getBridgeClient';
import { getBridgeDefaultModelSettings } from './getBridgeDefaultModelSettings';
import { refreshBridgeState } from './refreshBridgeState';

/**
 * Что это: стартовая инициализация daemon bridge после создания объекта.
 * Зачем нужно: daemon должен получить initialize, state должен синхронизироваться, а пустой workspace — получить первый чат.
 * Какую продуктовую проблему решает: AIST webview открывается в готовом рабочем состоянии без ручного refresh.
 */
export async function initializeBridgeRuntime({ context }: { context: BridgeRuntimeContext }): Promise<void> {
  let client = await getBridgeClient({ context });
  let initialized = await client.request<DaemonInitializeResult>('initialize');
  if (initialized.state.protocolVersion !== DAEMON_PROTOCOL_VERSION) {
    context.logger.info('Restarting stale AIST daemon after protocol mismatch', {
      expectedProtocolVersion: DAEMON_PROTOCOL_VERSION,
      actualProtocolVersion: initialized.state.protocolVersion,
      socketPath: context.processManager.socketPath
    });
    await context.processManager.restartStaleDaemon(client);
    context.state.client = undefined;
    client = await getBridgeClient({ context });
    initialized = await client.request<DaemonInitializeResult>('initialize');
    if (initialized.state.protocolVersion !== DAEMON_PROTOCOL_VERSION) {
      throw new Error(
        `AIST daemon protocol mismatch after restart: expected ${DAEMON_PROTOCOL_VERSION}, got ${initialized.state.protocolVersion}.`
      );
    }
  }
  await refreshBridgeState({ context });

  if (!context.chats.getSummaries().length) {
    await createBridgeChat({ context, settings: getBridgeDefaultModelSettings({ context }) });
  }

  context.logger.info('VS Code daemon runtime bridge initialized', {
    workspaceRoot: context.workspaceRoot,
    chatCount: context.chats.getSummaries().length,
    socketPath: context.processManager.socketPath
  });
}
