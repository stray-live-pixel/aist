import type { AutonomousEngineId } from './ids';
import type { AutonomousVcsIsolationOptions } from './vcs';

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
