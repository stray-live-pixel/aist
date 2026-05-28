import { coreRuntimeBoundary } from '../core';

export {
  CLI_APPROVAL_REQUIRED_EXIT_CODE,
  CLI_NAME,
  CLI_VERSION,
  CliUsageError,
  formatDoctorOutput,
  formatHelpOutput,
  formatPathsOutput,
  parseCliArgs,
  resolveCliPaths,
  runCli,
  runDoctor
} from './router';
export type {
  CliApprovalMode,
  CliCommand,
  CliModelProvider,
  CliPaths,
  CliWriter,
  DoctorCheck,
  DoctorCheckStatus,
  DoctorResult,
  RunCliOptions
} from './router';
export {
  AistDaemonServer,
  DaemonJsonRpcClient,
  DaemonJsonRpcError,
  DAEMON_BUSY_ERROR_CODE,
  DAEMON_EVENT_METHOD,
  DAEMON_PROTOCOL_VERSION,
  getDaemonSocketPath
} from './daemonIndex';
export type {
  AistDaemonServerOptions,
  DaemonActiveRun,
  DaemonAutonomousExportResult,
  DaemonAutonomousStartResult,
  DaemonAutonomousStateResult,
  DaemonAutonomousStopResult,
  DaemonChat,
  DaemonChatAskParams,
  DaemonChatAskResult,
  DaemonEvent,
  DaemonState
} from './daemonIndex';

export interface CliEntrypointMetadata {
  readonly name: 'aist-cli';
  readonly coreVscodeImportsAllowed: false;
}

export const cliEntrypointMetadata: CliEntrypointMetadata = {
  name: 'aist-cli',
  coreVscodeImportsAllowed: coreRuntimeBoundary.vscodeImportsAllowed
};
