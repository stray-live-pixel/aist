import * as vscode from 'vscode';

import type { DaemonModelsResult } from '../../../../cli/daemonProtocol';
import type { ModelProvider, OpenRouterModelOption, ToolApprovalDecision } from '../../../../core/shared/types/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { updateBridgeDaemonConfig } from './updateBridgeDaemonConfig';

/** Разрешает ожидающий tool approval в daemon. */
export async function resolveBridgeToolCall({
  context,
  messageId,
  decision
}: {
  context: BridgeRuntimeContext;
  messageId: string;
  decision: ToolApprovalDecision;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  await client.request('approval.resolve', { messageId, ...decision });
}

/** Синхронизирует tool permissions из VS Code settings в daemon. */
export async function syncBridgeToolPermissions({ context }: { context: BridgeRuntimeContext }): Promise<void> {
  const toolPermissions =
    vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('toolPermissions') || {};
  await updateBridgeDaemonConfig({ context, key: 'toolPermissions', value: toolPermissions });
}

/** Запрашивает список моделей или принудительно обновляет provider cache. */
export async function refreshBridgeModels({
  context,
  force = false,
  provider = 'all'
}: {
  context: BridgeRuntimeContext;
  force?: boolean;
  provider?: ModelProvider | 'all';
}): Promise<readonly OpenRouterModelOption[]> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonModelsResult>(force ? 'models.refresh' : 'models.list', { provider });
  return result.models;
}
