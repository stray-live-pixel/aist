import { type AutonomousEngineId } from '../../../shared/types';

export type LaunchDraft = {
  engineId: AutonomousEngineId;
  dryRun: boolean;
  extraPrompt?: string;
};
