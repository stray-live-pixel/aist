import type { AutonomousEngineDescriptor, AutonomousEngineId, AutonomousEvent } from '../types';

export type AutonomousEngineRunRequest = {
  prompt: string;
  model?: string;
  workDir: string;
  stageIndex?: number;
  signal: AbortSignal;
  sessionRef?: string;
  forkFromSessionRef?: string;
  onEvent(event: AutonomousEvent): Promise<void> | void;
};

export type AutonomousEngineRunResult = {
  result: string;
  sessionRef?: string;
};

export type AutonomousEngine = AutonomousEngineDescriptor & {
  run(request: AutonomousEngineRunRequest): Promise<AutonomousEngineRunResult>;
};

export type AutonomousEngineRegistry = {
  list(): AutonomousEngineDescriptor[];
  get(engineId: AutonomousEngineId): AutonomousEngine;
};
