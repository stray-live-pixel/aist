import fs from 'node:fs/promises';
import path from 'node:path';

import { type FrontmatterObject, parseMarkdownFrontmatter } from '../../../shared/lib/frontmatter';
import { type AutonomousDefinitionDiagnostic, type AutonomousRunDefinition } from '../types';
import { DefinitionSource } from './DefinitionSource';
import { asPositiveInteger } from './asPositiveInteger';
import { asString } from './asString';
import { readRunTasks } from './readRunTasks';
import { toDiagnostic } from './toDiagnostic';

export async function readRunDefinition(source: DefinitionSource, id: string): Promise<AutonomousRunDefinition> {
  const runRoot = path.join(source.runsRoot, id);
  const indexPath = path.join(runRoot, '.index.md');
  const diagnostics: AutonomousDefinitionDiagnostic[] = [];
  let attributes: FrontmatterObject = {};

  try {
    attributes = parseMarkdownFrontmatter(await fs.readFile(indexPath, 'utf8')).attributes;
  } catch (error) {
    diagnostics.push(toDiagnostic('run.indexMissing', error, indexPath));
  }

  const workDir = asString(attributes.dir) || '';
  if (!workDir) {
    diagnostics.push({ code: 'run.dirMissing', message: 'Run definition must define dir.', path: indexPath });
  }

  const tasks = await readRunTasks(runRoot, attributes.tasks, diagnostics);

  return {
    id,
    title: asString(attributes.title) || id,
    workDir,
    repeat: asPositiveInteger(attributes.repeat, 1),
    tasks,
    sourceKind: source.kind,
    sourcePath: runRoot,
    diagnostics
  };
}
