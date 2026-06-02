import { openWorkspaceFile as openWorkspaceFileFromWebview } from '../commands/openWorkspaceFile';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: открывает файл workspace из webview-команды.
 * Зачем нужно: message cards и tool previews могут переводить пользователя к конкретной строке.
 * Какую продуктовую проблему решает: review результата агента быстрее и точнее.
 */
export function openWorkspaceFileAction({
  state,
  filePath,
  line,
  column,
  endLine,
  endColumn
}: {
  state: AgentControllerState;
  filePath: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}): Promise<void> {
  return openWorkspaceFileFromWebview({ filePath, line, column, endLine, endColumn, logger: state.logger });
}
