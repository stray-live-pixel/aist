export type AutonomousSourceKind = 'native' | 'legacy';

export type AutonomousEngineId = 'claude-cli' | 'codex-cli' | 'openrouter-api' | 'codex-api' | 'dry-run';

export type AutonomousSessionKind = 'flow' | 'run' | 'direct';

export type AutonomousSessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';

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

export type AutonomousEventLevel = 'debug' | 'info' | 'warning' | 'error';

export type AutonomousEventAction =
  | 'ASSISTANT'
  | 'DONE'
  | 'STAGE'
  | 'STAGE_CTX'
  | 'FLOW'
  | 'WRITE'
  | 'RESULT'
  | 'ERROR'
  | 'SYS'
  | 'DRY'
  | 'BASH'
  | 'EVENT'
  | 'THINKING'
  | 'BATCH';

export type AutonomousEvent = {
  id: string;
  ts: string;
  level: AutonomousEventLevel;
  action: AutonomousEventAction;
  message: string;
  stageIndex?: number;
  taskIndex?: number;
  data?: Record<string, unknown>;
};

export type AutonomousVcsCommand = 'git' | 'arc' | (string & {});

export type AutonomousVcsIsolationOptions = {
  enabled: boolean;
  command?: AutonomousVcsCommand;
  baseBranch?: string;
  branchName?: string;
  worktreePath?: string;
  keepWorktree?: boolean;
};

export type AutonomousVcsEnvironment = {
  command: AutonomousVcsCommand;
  baseBranch: string;
  branchName: string;
  worktreePath: string;
  keepWorktree: boolean;
};

export type AutonomousSessionMeta = {
  id: string;
  kind: AutonomousSessionKind;
  targetId?: string;
  status: AutonomousSessionStatus;
  engineId: AutonomousEngineId;
  workspaceRoot: string;
  workDir: string;
  vcs?: AutonomousVcsEnvironment;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  error?: string;
};

export type AutonomousCommandState = {
  kind: AutonomousSessionKind;
  targetId?: string;
  engineId: AutonomousEngineId;
  dryRun: boolean;
  workDir: string;
  vcs?: AutonomousVcsEnvironment;
  extraPrompt?: string;
};

export type AutonomousStageRunState = {
  index: number;
  title: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'stopped';
  startedAt?: string;
  finishedAt?: string;
  model?: string;
  sessionRef?: string;
  result?: string;
  error?: string;
};

export type AutonomousFlowState = {
  flowId: string;
  status: AutonomousSessionStatus;
  currentStageIndex?: number;
  stages: AutonomousStageRunState[];
};

export type AutonomousBatchTaskState = {
  index: number;
  taskPath: string;
  flowId: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'stopped';
  currentRepeat: number;
  attempts: number;
  childSessionIds: string[];
  movedPath?: string;
  error?: string;
};

export type AutonomousBatchState = {
  runId: string;
  status: AutonomousSessionStatus;
  currentOuterRepeat: number;
  totalOuterRepeats: number;
  tasks: AutonomousBatchTaskState[];
};

export type AutonomousSessionView = {
  meta: AutonomousSessionMeta;
  command?: AutonomousCommandState;
  flow?: AutonomousFlowState;
  batch?: AutonomousBatchState;
  events: AutonomousEvent[];
};

export type AutonomousEngineCapabilities = {
  resume: boolean;
  fork: boolean;
  tools: boolean;
  requiresBinary?: string;
  requiresAuth?: boolean;
};

export type AutonomousEngineDescriptor = {
  id: AutonomousEngineId;
  label: string;
  capabilities: AutonomousEngineCapabilities;
};

export type AutonomousLaunchOptions = {
  engineId: AutonomousEngineId;
  dryRun: boolean;
  workDir?: string;
  vcsIsolation?: AutonomousVcsIsolationOptions;
  extraPrompt?: string;
};

export type AutonomousState = {
  workspaceName: string;
  storageRoot: string;
  definitions: AutonomousDefinitions;
  engines: AutonomousEngineDescriptor[];
  sessions: AutonomousSessionView[];
  diagnostics: AutonomousDefinitionDiagnostic[];
};
