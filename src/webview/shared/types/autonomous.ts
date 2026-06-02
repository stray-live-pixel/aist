export type AutonomousSourceKind = 'native' | 'legacy';
export type AutonomousEngineId = 'claude-cli' | 'codex-cli' | 'openrouter-api' | 'codex-api' | 'dry-run';
export type AutonomousSessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';

export type AutonomousDefinitionDiagnostic = {
  code: string;
  message: string;
  path?: string;
};

export type AutonomousStageDefinition = {
  index: number;
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: { mode: 'continue' | 'continue-from' | 'summary-from'; from?: number; summaryRules?: string }[];
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

export type AutonomousEvent = {
  id: string;
  ts: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  action: string;
  message: string;
  stageIndex?: number;
  taskIndex?: number;
  data?: Record<string, unknown>;
};

export type AutonomousSessionView = {
  meta: {
    id: string;
    kind: 'flow' | 'run' | 'direct';
    targetId?: string;
    status: AutonomousSessionStatus;
    engineId: AutonomousEngineId;
    workspaceRoot: string;
    workDir: string;
    startedAt: string;
    finishedAt?: string;
    error?: string;
  };
  events: AutonomousEvent[];
};

export type CreateAutonomousFlowInput = {
  id: string;
  title?: string;
};

export type EditableAutonomousStageDefinition = {
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: { mode: 'continue' | 'continue-from' | 'summary-from'; from?: number; summaryRules?: string }[];
  summaryRules?: string;
};

export type EditableAutonomousFlowDefinition = {
  id: string;
  title: string;
  description: string;
  body: string;
  defaultModel?: string;
  defaultCodexModel?: string;
  defaultSummaryRules?: string;
  stages: EditableAutonomousStageDefinition[];
};

export type AutonomousState = {
  workspaceName: string;
  storageRoot: string;
  definitions: {
    flows: AutonomousFlowDefinition[];
    runs: AutonomousRunDefinition[];
    diagnostics: AutonomousDefinitionDiagnostic[];
  };
  engines: {
    id: AutonomousEngineId;
    label: string;
    capabilities: { resume: boolean; fork: boolean; tools: boolean; requiresBinary?: string; requiresAuth?: boolean };
  }[];
  sessions: AutonomousSessionView[];
  diagnostics: AutonomousDefinitionDiagnostic[];
};
