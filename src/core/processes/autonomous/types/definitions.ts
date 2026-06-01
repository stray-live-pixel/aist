import type { AutonomousSourceKind } from './ids';

export type AutonomousDefinitionDiagnosticCode =
  | 'source.notFound'
  | 'frontmatter.invalid'
  | 'flow.indexMissing'
  | 'flow.stageMissing'
  | 'flow.legacyField'
  | 'run.indexMissing'
  | 'run.dirMissing'
  | 'run.taskMissing'
  | 'run.flowMissing'
  | 'run.pathEscapesRoot';

export type AutonomousDefinitionDiagnostic = {
  code: AutonomousDefinitionDiagnosticCode;
  message: string;
  path?: string;
};

export type AutonomousStageContext =
  | { mode: 'continue'; from?: number }
  | { mode: 'continue-from'; from: number }
  | { mode: 'summary-from'; from: number; summaryRules?: string };

export type AutonomousStageDefinition = {
  index: number;
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: AutonomousStageContext[];
  summaryRules?: string;
  sourcePath: string;
};

export type AutonomousFlowDefinition = {
  id: string;
  title: string;
  description: string;
  body: string;
  defaultModel?: string;
  defaultCodexModel?: string;
  defaultSummaryRules?: string;
  stages: AutonomousStageDefinition[];
  sourceKind: AutonomousSourceKind;
  sourcePath: string;
  diagnostics: AutonomousDefinitionDiagnostic[];
};

export type AutonomousRunTaskDefinition = {
  index: number;
  taskPath: string;
  flowId: string;
  repeat: number;
  body: string;
  sourcePath: string;
};

export type AutonomousRunDefinition = {
  id: string;
  title: string;
  workDir: string;
  repeat: number;
  tasks: AutonomousRunTaskDefinition[];
  sourceKind: AutonomousSourceKind;
  sourcePath: string;
  diagnostics: AutonomousDefinitionDiagnostic[];
};

export type AutonomousDefinitions = {
  flows: AutonomousFlowDefinition[];
  runs: AutonomousRunDefinition[];
  diagnostics: AutonomousDefinitionDiagnostic[];
};
