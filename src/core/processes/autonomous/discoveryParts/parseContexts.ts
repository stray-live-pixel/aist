import path from 'node:path';

import { type FrontmatterValue } from '../../../shared/lib/frontmatter';
import { type AutonomousDefinitionDiagnostic, type AutonomousStageContext } from '../types';
import { asOptionalPositiveInteger } from './asOptionalPositiveInteger';
import { asString } from './asString';
import { isObject } from './isObject';

export function parseContexts(
  rawContexts: FrontmatterValue | undefined,
  diagnostics: AutonomousDefinitionDiagnostic[],
  sourcePath: string
): AutonomousStageContext[] {
  if (!Array.isArray(rawContexts)) {
    return [];
  }

  const contexts: AutonomousStageContext[] = [];
  for (const rawContext of rawContexts) {
    if (!isObject(rawContext)) {
      diagnostics.push({ code: 'frontmatter.invalid', message: 'Context must be an object.', path: sourcePath });
      continue;
    }

    const mode = asString(rawContext.mode);
    const from = asOptionalPositiveInteger(rawContext.from);
    if (mode === 'continue') {
      contexts.push(from ? { mode, from } : { mode });
    } else if (mode === 'continue-from' && from) {
      contexts.push({ mode, from });
    } else if (mode === 'summary-from' && from) {
      contexts.push({ mode, from, summaryRules: asString(rawContext.summary_rules) });
    } else {
      diagnostics.push({
        code: 'frontmatter.invalid',
        message: `Unsupported context: ${JSON.stringify(rawContext)}`,
        path: sourcePath
      });
    }
  }

  return contexts;
}
