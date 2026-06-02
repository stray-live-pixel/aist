import type { DaemonJsonRpcClient } from '../../../../cli/daemonClient';
import type { DaemonClientCapabilitiesResult } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { approveBridgePreview } from './approveBridgePreview';
import { cleanupBridgePreview } from './cleanupBridgePreview';
import { handleBridgeNotification } from './handleBridgeNotification';
import { openBridgeWorkspaceFile } from './openBridgeWorkspaceFile';
import { prepareBridgePreview } from './prepareBridgePreview';

/**
 * Что это: регистрирует callbacks, которые daemon может вызвать у VS Code extension.
 * Зачем нужно: daemon получает active editor context, notifications, file open и editable diff preview.
 * Какую продуктовую проблему решает: агент может работать с VS Code UI без прямой зависимости daemon от vscode API.
 */
export async function registerBridgeCapabilities({
  context,
  client
}: {
  context: BridgeRuntimeContext;
  client: DaemonJsonRpcClient;
}): Promise<void> {
  client.onRequest(
    'client.activeEditorContext',
    async () => context.activeEditorContextProvider.getEditorContext() || null
  );
  client.onRequest('client.notification', async (params) => handleBridgeNotification({ context, params }));
  client.onRequest('client.openWorkspaceFile', async (params) => openBridgeWorkspaceFile({ context, params }));
  client.onRequest('client.previewEdit.prepare', async (params) => prepareBridgePreview({ context, params }));
  client.onRequest('client.previewEdit.approve', async (params) => approveBridgePreview({ context, params }));
  client.onRequest('client.previewEdit.cleanup', async (params) => cleanupBridgePreview({ context, params }));

  await client.request<DaemonClientCapabilitiesResult>('client.capabilities', {
    capabilities: {
      activeEditorContext: true,
      notifications: true,
      openWorkspaceFile: true,
      vscodeEditableDiffPreview: true
    }
  });
}
