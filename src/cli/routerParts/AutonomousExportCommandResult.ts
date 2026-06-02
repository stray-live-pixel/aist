import { type AutonomousExportFormat } from '../../core/processes/autonomous';

export type AutonomousExportCommandResult = {
  readonly workspaceRoot: string;
  readonly sessionId: string;
  readonly format: AutonomousExportFormat;
  readonly content: string;
};
