import type { CoreRuntimeBoundary } from './types';

export type * from './types';

export const coreRuntimeBoundary: CoreRuntimeBoundary = {
  layer: 'core',
  vscodeImportsAllowed: false
};
