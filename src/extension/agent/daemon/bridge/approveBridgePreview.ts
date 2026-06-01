import type { DaemonClientPreviewApproveParams } from '../../../../cli/daemonProtocol';
import type { JsonObject } from '../../../../core/shared/types/types';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: применяет ранее подготовленный editable diff preview.
 * Зачем нужно: approval из daemon должен найти VS Code handle по previewId.
 * Какую продуктовую проблему решает: пользовательское подтверждение реально применяет тот diff, который был показан.
 */
export async function approveBridgePreview({
  context,
  params
}: {
  context: BridgeRuntimeContext;
  params: DaemonClientPreviewApproveParams;
}): Promise<JsonObject> {
  const preview = context.state.previewHandles.get(params.previewId);
  if (!preview) {
    return { ok: false, error: 'Preview is no longer available.' };
  }

  return (await preview.approve()) as JsonObject;
}
