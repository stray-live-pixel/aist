import type { DaemonJsonRpcClient } from '../../../../cli/daemonClient';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { queueBridgeRefresh } from './queueBridgeRefresh';
import { registerBridgeCapabilities } from './registerBridgeCapabilities';

/**
 * Что это: возвращает активный JSON-RPC client и регистрирует bridge callbacks при reconnect.
 * Зачем нужно: daemon process manager может выдать новый client после restart/socket reconnect.
 * Какую продуктовую проблему решает: extension продолжает работать с daemon после перезапуска процесса.
 */
export async function getBridgeClient({ context }: { context: BridgeRuntimeContext }): Promise<DaemonJsonRpcClient> {
  const client = await context.processManager.getClient();
  if (client !== context.state.client) {
    context.state.client = client;
    await registerBridgeCapabilities({ context, client });
    await client.subscribe();
    client.onEvent((event) => queueBridgeRefresh({ context, event }));
  }

  return client;
}
