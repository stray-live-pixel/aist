import type { DaemonClientPreviewPrepareParams } from '../../../../cli/daemonProtocol';
import type { JsonObject } from '../../../../core/shared/types/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: готовит VS Code editable diff preview по запросу daemon.
 * Зачем нужно: daemon умеет запускать tools, но preview должен отображаться внутри VS Code.
 * Какую продуктовую проблему решает: пользователь approve/reject изменения до записи в workspace.
 */
export async function prepareBridgePreview({
  context,
  params
}: {
  context: BridgeRuntimeContext;
  params: DaemonClientPreviewPrepareParams;
}): Promise<{ preview?: JsonObject }> {
  const preview = await context.previewEditProvider.prepare(params.toolName, params.args);
  if (!preview) {
    return {};
  }

  context.state.previewHandles.set(params.previewId, preview);
  return { preview: preview.preview as JsonObject };
}
