import { AuthStatusResult } from './AuthStatusResult';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';

export function formatAuthSource(source: AuthStatusResult['source']): string {
  if (source === 'env') {
    return OPENROUTER_ENV_KEY;
  }

  if (source === 'global-secret') {
    return 'global secret store';
  }

  return 'none';
}
