export type AutonomousStopCommandResult = {
  readonly workspaceRoot: string;
  readonly sessionId: string;
  readonly stopped: boolean;
};
