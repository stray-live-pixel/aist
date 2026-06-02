import type {
  AutonomousExportFormat,
  AutonomousLaunchOptions,
  AutonomousStartResult,
  AutonomousState,
  AutonomousStopResult
} from '../../core/processes/autonomous';

export type DaemonAutonomousStateResult = {
  readonly operationId: string;
  readonly state: AutonomousState;
};

export type DaemonAutonomousFlowStartParams = {
  readonly flowId: string;
  readonly launch: AutonomousLaunchOptions;
};

export type DaemonAutonomousRunStartParams = {
  readonly runId: string;
  readonly launch: AutonomousLaunchOptions;
};

export type DaemonAutonomousStartResult = AutonomousStartResult;

export type DaemonAutonomousStopParams = {
  readonly sessionId: string;
};

export type DaemonAutonomousStopResult = AutonomousStopResult;

export type DaemonAutonomousExportParams = {
  readonly sessionId: string;
  readonly format?: AutonomousExportFormat;
};

export type DaemonAutonomousExportResult = {
  readonly operationId: string;
  readonly sessionId: string;
  readonly format: AutonomousExportFormat;
  readonly content: string;
};
