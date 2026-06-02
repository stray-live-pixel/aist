import fs from 'node:fs/promises';
import path from 'node:path';

import { parseMarkdownFrontmatter } from '../../../shared/lib/frontmatter';
import { type AutonomousDefinitionDiagnostic, type AutonomousStageDefinition } from '../types';
import { asString } from './asString';
import { parseContexts } from './parseContexts';
import { toDiagnostic } from './toDiagnostic';

export async function readStageDefinition(
  flowRoot: string,
  stageFile: string,
  index: number,
  diagnostics: AutonomousDefinitionDiagnostic[]
): Promise<AutonomousStageDefinition | undefined> {
  const stagePath = path.join(flowRoot, stageFile);
  try {
    const parsed = parseMarkdownFrontmatter(await fs.readFile(stagePath, 'utf8'));
    return {
      index,
      file: stageFile,
      title: asString(parsed.attributes.title) || stageFile,
      body: parsed.body.trim(),
      model: asString(parsed.attributes.model),
      codexModel: asString(parsed.attributes.codex_model),
      contexts: parseContexts(parsed.attributes.contexts, diagnostics, stagePath),
      summaryRules: asString(parsed.attributes.summary_rules),
      sourcePath: stagePath
    };
  } catch (error) {
    diagnostics.push(toDiagnostic('flow.stageMissing', error, stagePath));
    return undefined;
  }
}
