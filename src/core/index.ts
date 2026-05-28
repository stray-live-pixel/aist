import type { CoreRuntimeBoundary } from './types';

export * from './storage';
export type * from './types';

export const coreRuntimeBoundary: CoreRuntimeBoundary = {
  layer: 'core',
  vscodeImportsAllowed: false
};
