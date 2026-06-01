import type { DaemonClientPreviewCleanupParams } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: очищает VS Code preview handle после approve/cancel/reconnect.
 * Зачем нужно: editable diff resources не должны оставаться открытыми после завершения tool-сценария.
 * Какую продуктовую проблему решает: workspace не захламляется устаревшими preview-редакторами.
 */
export async function cleanupBridgePreview({
  context,
  params
}: {
  context: BridgeRuntimeContext;
  params: DaemonClientPreviewCleanupParams;
}): Promise<{ ok: true }> {
  const preview = context.state.previewHandles.get(params.previewId);
  context.state.previewHandles.delete(params.previewId);
  await preview?.cleanup();
  return { ok: true };
}
