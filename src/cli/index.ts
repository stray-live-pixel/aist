import { coreRuntimeBoundary } from '../core';

export {
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
  CliCommand,
  CliModelProvider,
  CliPaths,
  CliWriter,
  DoctorCheck,
  DoctorCheckStatus,
  DoctorResult,
  RunCliOptions
} from './router';

export interface CliEntrypointMetadata {
  readonly name: 'aist-cli';
  readonly coreVscodeImportsAllowed: false;
}

export const cliEntrypointMetadata: CliEntrypointMetadata = {
  name: 'aist-cli',
  coreVscodeImportsAllowed: coreRuntimeBoundary.vscodeImportsAllowed
};
