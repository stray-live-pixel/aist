import type { DaemonClientOpenWorkspaceFileParams } from '../../../../cli/daemonProtocol';
import { openWorkspaceFile as openWorkspaceFileFromWebview } from '../../commands/openWorkspaceFile';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: открывает файл workspace по запросу daemon.
 * Зачем нужно: tool results и diagnostics могут просить extension показать конкретное место в коде.
 * Какую продуктовую проблему решает: пользователь быстро переходит к файлу/строке из ответа агента.
 */
export async function openBridgeWorkspaceFile({
  context,
  params
}: {
  context: BridgeRuntimeContext;
  params: DaemonClientOpenWorkspaceFileParams;
}): Promise<{ opened: boolean }> {
  await openWorkspaceFileFromWebview({
    filePath: params.path,
    line: params.line,
    column: params.column,
    endLine: params.endLine,
    endColumn: params.endColumn,
    logger: context.logger
  });
  return { opened: true };
}
