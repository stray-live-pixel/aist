import type { DaemonSubagentGetResult } from '../../../../cli/daemonProtocol';
import type { SubagentRun } from '../../../../core/shared/types/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { refreshBridgeSubagentRuns } from './refreshBridgeSubagentRuns';
import { upsertSubagentRun } from './upsertSubagentRun';

/** Возвращает cached subagent runs или обновляет список из daemon. */
export async function listBridgeSubagentRuns({
  context,
  parentChatId
}: {
  context: BridgeRuntimeContext;
  parentChatId: string;
}): Promise<readonly SubagentRun[]> {
  if (!context.state.subagentRunsByParentChat.has(parentChatId)) {
    await refreshBridgeSubagentRuns({ context, parentChatId });
  }

  return context.state.subagentRunsByParentChat.get(parentChatId) || [];
}

/** Находит subagent run в cache или запрашивает daemon по id. */
export async function getBridgeSubagentRun({
  context,
  runId
}: {
  context: BridgeRuntimeContext;
  runId: string;
}): Promise<SubagentRun | undefined> {
  for (const runs of context.state.subagentRunsByParentChat.values()) {
    const cached = runs.find((run) => run.id === runId);
    if (cached) {
      return cached;
    }
  }

  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonSubagentGetResult>('subagent.get', { runId });
  context.state.subagentRunsByParentChat.set(
    result.run.parentChatId,
    upsertSubagentRun({
      runs: context.state.subagentRunsByParentChat.get(result.run.parentChatId) || [],
      nextRun: result.run
    })
  );
  return result.run;
}
