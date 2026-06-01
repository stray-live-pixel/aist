import type { DaemonConfigUpdateResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';

/**
 * Что это: обновляет один workspace config key в daemon.
 * Зачем нужно: daemon хранит runtime-настройки отдельно от VS Code configuration.
 * Какую продуктовую проблему решает: агент использует свежие model/tool/language настройки без restart daemon.
 */
export async function updateBridgeDaemonConfig({
  context,
  key,
  value
}: {
  context: BridgeRuntimeContext;
  key: string;
  value: unknown;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  await client.request<DaemonConfigUpdateResult>('config.update', { key, value, scope: 'workspace' });
}
