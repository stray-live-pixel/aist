import { type AutonomousEngineId } from '../../../types';

export type LaunchDraft = {
  engineId: AutonomousEngineId;
  dryRun: boolean;
  extraPrompt?: string;
};
