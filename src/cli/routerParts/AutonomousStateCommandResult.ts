import { type AutonomousState } from '../../core/processes/autonomous';

export type AutonomousStateCommandResult = {
  readonly workspaceRoot: string;
  readonly state: AutonomousState;
};
