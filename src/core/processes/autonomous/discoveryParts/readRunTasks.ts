import fs from 'node:fs/promises';
import path from 'node:path';

import { type FrontmatterValue } from '../../../shared/lib/frontmatter';
import { type AutonomousDefinitionDiagnostic, type AutonomousRunTaskDefinition } from '../types';
import { asPositiveInteger } from './asPositiveInteger';
import { asString } from './asString';
import { isInside } from './isInside';
import { isObject } from './isObject';

export async function readRunTasks(
  runRoot: string,
  rawTasks: FrontmatterValue | undefined,
  diagnostics: AutonomousDefinitionDiagnostic[]
): Promise<AutonomousRunTaskDefinition[]> {
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const definitions: AutonomousRunTaskDefinition[] = [];

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
    const task = tasks[taskIndex];
    if (!isObject(task)) {
      diagnostics.push({ code: 'run.taskMissing', message: 'Run task must be an object.', path: runRoot });
      continue;
    }

    const taskPath = asString(task.task);
    const flowId = asString(task.flow);
    if (!taskPath || !flowId) {
      diagnostics.push({ code: 'run.taskMissing', message: 'Run task must define task and flow.', path: runRoot });
      continue;
    }

    const resolvedTaskPath = path.resolve(runRoot, taskPath);
    if (!isInside(runRoot, resolvedTaskPath)) {
      diagnostics.push({
        code: 'run.pathEscapesRoot',
        message: `Task path escapes run root: ${taskPath}`,
        path: taskPath
      });
      continue;
    }

    let body = '';
    try {
      body = (await fs.readFile(resolvedTaskPath, 'utf8')).trim();
    } catch {
      // Legacy run may already have moved all tasks to done. Это diagnostic, но
      // не fatal: UI всё равно должен показать definition и дать пользователю
      // понять, почему запускать нечего.
      diagnostics.push({
        code: 'run.taskMissing',
        message: `Task file is missing: ${taskPath}`,
        path: resolvedTaskPath
      });
    }

    definitions.push({
      index: taskIndex + 1,
      taskPath,
      flowId,
      repeat: asPositiveInteger(task.repeat, 1),
      body,
      sourcePath: resolvedTaskPath
    });
  }

  return definitions;
}
