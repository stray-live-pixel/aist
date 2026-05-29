import { createToolError, toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import type { OpenRouterTool } from '../../../shared/types/types';
import { runBashScriptTool, runBashScriptToolDefinition } from '../../scripts/sh/run_bash_script/runBashScript';
import { createDirectoryToolDefinition, runCreateDirectoryTool } from '../create_directory/createDirectory';
import { deletePathToolDefinition, runDeletePathTool } from '../delete_path/deletePath';
import { runGetWorkspaceInfoTool } from '../get_workspace_info/getWorkspaceInfo';
import { grepSearchToolDefinition, runGrepSearchTool } from '../grep_search/grepSearch';
import { listFilesToolDefinition, runListFilesTool } from '../list_files/listFiles';
import { readFileToolDefinition, runReadFileTool } from '../read_file/readFile';
import { readFileRangeToolDefinition, runReadFileRangeTool } from '../read_file_range/readFileRange';
import { replaceInFileToolDefinition, runReplaceInFileTool } from '../replace_in_file/replaceInFile';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
import { runWriteFileTool, writeFileToolDefinition } from '../write_file/writeFile';

export type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';
export type { ResolvedWorkspacePath } from '../shared/resolvedWorkspacePath';

/**
 * Каталог Node-инструментов файловой системы, который можно показать модели.
 *
 * Здесь остаются только инструменты, безопасные для текущего CLI/runtime
 * контракта. `get_workspace_info` запускается вручную из кода, но не
 * показывается модели, потому что workspace context передаётся отдельно.
 */
export const nodeFilesystemTools: OpenRouterTool[] = [
  listFilesToolDefinition,
  readFileToolDefinition,
  readFileRangeToolDefinition,
  grepSearchToolDefinition,
  runBashScriptToolDefinition,
  writeFileToolDefinition,
  replaceInFileToolDefinition,
  createDirectoryToolDefinition,
  deletePathToolDefinition
];

/**
 * Создаёт executor для runtime-слоя.
 *
 * Runtime знает только имя инструмента и JSON-аргументы. Эта функция замыкает
 * workspace context и возвращает единый обработчик, который можно передать в
 * ToolRunner без прямой зависимости runtime от конкретных fs-инструментов.
 */
export function createNodeFilesystemToolRunner({
  context
}: {
  context: NodeFilesystemToolContext;
}): (toolName: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> {
  return (toolName, args) => runNodeFilesystemTool({ context, toolName, args });
}

/**
 * Запускает конкретный fs/script инструмент по имени.
 *
 * Оркестратор не содержит бизнес-логики инструментов: он только маршрутизирует
 * вызов в доменный runner и превращает исключения в структурированный результат,
 * который агент может безопасно прочитать и продолжить работу.
 */
export async function runNodeFilesystemTool({
  context,
  toolName,
  args
}: {
  context: NodeFilesystemToolContext;
  toolName: string;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  try {
    switch (toolName) {
      case 'get_workspace_info':
        return await runGetWorkspaceInfoTool({ context, args });
      case 'list_files':
        return await runListFilesTool({ context, args });
      case 'read_file':
        return await runReadFileTool({ context, args });
      case 'read_file_range':
        return await runReadFileRangeTool({ context, args });
      case 'grep_search':
        return await runGrepSearchTool({ context, args });
      case 'run_bash_script':
        return await runBashScriptTool({ context, args });
      case 'write_file':
        return await runWriteFileTool({ context, args });
      case 'replace_in_file':
        return await runReplaceInFileTool({ context, args });
      case 'create_directory':
        return await runCreateDirectoryTool({ context, args });
      case 'delete_path':
        return await runDeletePathTool({ context, args });
      default:
        throw createToolError('INVALID_ARGUMENT', `Unknown tool: ${toolName}`, { toolName });
    }
  } catch (error) {
    return toStructuredToolFailure(error);
  }
}
