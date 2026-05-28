import type { CoreRuntimeBoundary } from './types';

export * from './storage';
export * from './config';
export type * from './types';

export const coreRuntimeBoundary: CoreRuntimeBoundary = {
  layer: 'core',
  vscodeImportsAllowed: false
};
