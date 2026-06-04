import fs from 'node:fs/promises';
import path from 'node:path';

import type { DeleteAutonomousFlowInput } from '../../../core/processes/autonomous';

/**
 * Что это: удаляет native workflow directory напрямую из workspace-файлов.
 * Зачем нужно: страница Workflow управляет именно файлами `.aist-agent/autonomous/flows`,
 * поэтому подтверждённое удаление должно менять файловую систему даже при stale daemon state.
 * Какую продуктовую проблему решает: workflow исчезает из проекта и UI после подтверждения пользователя.
 */
export async function deleteAutonomousFlowDirectory({
  workspaceRoot,
  flow
}: {
  workspaceRoot: string;
  flow: DeleteAutonomousFlowInput;
}): Promise<void> {
  const targetPath = getAutonomousFlowDeletePath({ workspaceRoot, flow });
  await fs.rm(targetPath, { recursive: true, force: true });
}

/**
 * Что это: вычисляет и валидирует путь удаления workflow.
 * Зачем нужно: удаление должно работать по source of truth текущего workspace, а не по возможному
 * stale sourcePath из daemon state.
 * Какую продуктовую проблему решает: пользователь удаляет выбранный native workflow, а не произвольный файл проекта.
 */
export function getAutonomousFlowDeletePath({
  workspaceRoot,
  flow
}: {
  workspaceRoot: string;
  flow: DeleteAutonomousFlowInput;
}): string {
  const flowId = normalizeFlowId({ flowId: flow.id });
  const workflowsRoot = path.resolve(workspaceRoot, '.aist-agent', 'autonomous', 'flows');
  const targetPath = path.resolve(workflowsRoot, flowId);

  if (!isInside({ root: workflowsRoot, target: targetPath })) {
    throw new Error(`Workflow path is outside native workflows root: ${flowId}`);
  }

  return targetPath;
}

/**
 * Что это: нормализует id workflow перед работой с путём.
 * Зачем нужно: id становится именем каталога, поэтому traversal и пустые значения запрещены.
 * Какую продуктовую проблему решает: удаление workflow остаётся предсказуемым и безопасным.
 */
function normalizeFlowId({ flowId }: { flowId: string }): string {
  const id = flowId.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) || id.includes('..')) {
    throw new Error('Workflow id must contain only letters, numbers, dot, underscore or dash.');
  }
  return id;
}

/**
 * Что это: проверяет, что путь находится внутри разрешённого корня.
 * Зачем нужно: path.resolve сам по себе не запрещает выход через `..`.
 * Какую продуктовую проблему решает: удаление workflow не может затронуть соседние директории workspace.
 */
function isInside({ root, target }: { root: string; target: string }): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
