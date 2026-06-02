import { type OpenRouterModelOption } from '../../core/shared/types/types';
import { CliModelProvider } from './CliModelProvider';

export type ModelsListResult = {
  readonly provider: CliModelProvider;
  readonly refreshed: boolean;
  readonly fallbackUsed: boolean;
  readonly errors: readonly string[];
  readonly models: readonly OpenRouterModelOption[];
};
