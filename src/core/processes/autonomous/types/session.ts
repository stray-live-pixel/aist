import type { AutonomousEvent } from './events';
import type { AutonomousEngineId, AutonomousSessionKind, AutonomousSessionStatus } from './ids';
import type { AutonomousVcsEnvironment } from './vcs';

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
