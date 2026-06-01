import type { DaemonSubagentListResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';

/**
 * Что это: обновляет список subagent runs для parent chat.
 * Зачем нужно: memory/tool subagents отображаются отдельными карточками и должны быть свежими.
 * Какую продуктовую проблему решает: пользователь видит актуальные subagent runs рядом с основным чатом.
 */
export async function refreshBridgeSubagentRuns({
  context,
  parentChatId
}: {
  context: BridgeRuntimeContext;
  parentChatId: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonSubagentListResult>('subagent.list', { parentChatId });
  context.state.subagentRunsByParentChat.set(parentChatId, [...result.runs]);
}
