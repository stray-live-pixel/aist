import fs from 'node:fs/promises';
import path from 'node:path';

import { type FrontmatterObject, parseMarkdownFrontmatter } from '../../../shared/lib/frontmatter';
import {
  type AutonomousDefinitionDiagnostic,
  type AutonomousFlowDefinition,
  type AutonomousStageDefinition
} from '../types';
import { DefinitionSource } from './DefinitionSource';
import { asString } from './asString';
import { asStringArray } from './asStringArray';
import { readStageDefinition } from './readStageDefinition';
import { toDiagnostic } from './toDiagnostic';

export async function readFlowDefinition(source: DefinitionSource, id: string): Promise<AutonomousFlowDefinition> {
  const flowRoot = path.join(source.flowsRoot, id);
  const indexPath = path.join(flowRoot, '.index.md');
  const diagnostics: AutonomousDefinitionDiagnostic[] = [];
  let attributes: FrontmatterObject = {};
  let body = '';

  try {
    const parsed = parseMarkdownFrontmatter(await fs.readFile(indexPath, 'utf8'));
    attributes = parsed.attributes;
    body = parsed.body.trim();
  } catch (error) {
    diagnostics.push(toDiagnostic('flow.indexMissing', error, indexPath));
  }

  const stageFiles = asStringArray(attributes.stages);
  const stages: AutonomousStageDefinition[] = [];
  for (let stageIndex = 0; stageIndex < stageFiles.length; stageIndex += 1) {
    const stageFile = stageFiles[stageIndex];
    const stage = await readStageDefinition(flowRoot, stageFile, stageIndex + 1, diagnostics);
    if (stage) {
      stages.push(stage);
    }
  }

  return {
    id,
    title: asString(attributes.title) || id,
    description: asString(attributes.description) || '',
    body,
    defaultModel: asString(attributes.model),
    defaultCodexModel: asString(attributes.codex_model),
    defaultSummaryRules: asString(attributes.default_summary_rules),
    stages,
    sourceKind: source.kind,
    sourcePath: flowRoot,
    diagnostics
  };
}
