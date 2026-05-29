import path from 'node:path';

import { getRepoMap } from '../../../shared/lib/repoMap';
import type { OpenRouterTool } from '../../../shared/types/types';
import { getWorkspace } from '../shared/getWorkspace';
import type { NodeFilesystemToolContext } from '../shared/nodeFilesystemToolContext';

/**
 * Описание инструмента get_workspace_info.
 *
 * Сейчас этот инструмент намеренно не добавляется в model-visible список
 * nodeFilesystemTools: workspace/repo map передаётся в базовом контексте. Но
 * definition хранится рядом с runner, чтобы контракт инструмента был в одном
 * месте и его можно было безопасно включить позже.
 */
export const getWorkspaceInfoToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'get_workspace_info',
    description: 'Return workspace metadata and repository map hints.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        }
      },
      required: ['reason'],
      additionalProperties: false
    }
  }
};

/**
 * Возвращает метаданные workspace и подсказки repo map.
 *
 * Функция ничего не меняет в проекте: она проверяет корень workspace, строит
 * компактную карту репозитория и возвращает только те поля, которые уже ожидают
 * CLI, daemon и тесты совместимости.
 */
export async function runGetWorkspaceInfoTool({
  context
}: {
  context: NodeFilesystemToolContext;
  args?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const workspace = await getWorkspace({ context });
  const repoMap = getRepoMap(workspace.rootPath);

  return {
    ok: true,
    workspaceName: context.workspaceName || path.basename(workspace.rootPath),
    workspacePath: workspace.rootPath,
    activeFile: context.activeFile || null,
    activeLanguage: context.activeLanguage || null,
    repoMap: {
      packageManager: repoMap.packageManager,
      packageName: repoMap.packageName,
      scripts: repoMap.scripts,
      configFiles: repoMap.configFiles,
      topLevelDirs: repoMap.topLevelDirs,
      verificationHints: repoMap.verificationHints,
      excerpt: repoMap.excerpt
    }
  };
}
