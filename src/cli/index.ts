import { coreRuntimeBoundary } from '../core';

export interface CliEntrypointMetadata {
  readonly name: 'aist-cli';
  readonly coreVscodeImportsAllowed: false;
}

export const cliEntrypointMetadata: CliEntrypointMetadata = {
  name: 'aist-cli',
  coreVscodeImportsAllowed: coreRuntimeBoundary.vscodeImportsAllowed
};
