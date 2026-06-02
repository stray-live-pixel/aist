import { type ModelProvider } from '../../core/shared/types/types';

export type AuthStatusResult = {
  readonly provider: ModelProvider;
  readonly authenticated: boolean;
  readonly source: 'env' | 'global-secret' | 'none';
};
