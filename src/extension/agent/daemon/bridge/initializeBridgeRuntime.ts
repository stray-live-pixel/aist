import type { DaemonInitializeResult } from '../../../../cli/daemonProtocol';
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
  const client = await getBridgeClient({ context });
  await client.request<DaemonInitializeResult>('initialize');
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
