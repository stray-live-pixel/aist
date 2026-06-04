import type { DaemonJsonRpcClient } from '../../../../cli/daemonClient/DaemonJsonRpcClient';

export function registerBrowserClientHandlers({ daemonClient }: { readonly daemonClient: DaemonJsonRpcClient }): void {
  daemonClient.onRequest('client.activeEditorContext', async () => null);
  daemonClient.onRequest('client.notification', async () => ({ shown: false }));
  daemonClient.onRequest('client.openWorkspaceFile', async () => ({ opened: false }));
  daemonClient.onRequest('client.previewEdit.prepare', async () => ({}));
  daemonClient.onRequest('client.previewEdit.approve', async () => ({}));
  daemonClient.onRequest('client.previewEdit.cleanup', async () => ({ ok: true }));
}
