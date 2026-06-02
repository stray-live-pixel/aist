import { type ProviderProfile } from '../../../../shared/types';

export function getEndpointPlaceholder(provider: ProviderProfile['provider']): string {
  return provider === 'codex'
    ? 'https://chatgpt.com/backend-api/codex/responses'
    : 'https://openrouter.ai/api/v1/chat/completions';
}
