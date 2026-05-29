import { CODEX_RESPONSES_URL, OPENROUTER_URL } from './modelDefaults';
import type { ProviderProfile } from './providerProfile';

/**
 * Что это: минимальные встроенные профили для поддерживаемых провайдеров.
 * Зачем нужно: старые пользователи продолжают работать без миграции настроек, а новые формы получают
 * предзаполненные стандартные endpoint-ы как прозрачный baseline для корпоративного override.
 */
export const DEFAULT_PROVIDER_PROFILES: ProviderProfile[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    provider: 'openrouter',
    endpoint: OPENROUTER_URL,
    proxyHost: '',
    builtIn: true
  },
  {
    id: 'codex',
    name: 'ChatGPT Codex',
    provider: 'codex',
    endpoint: CODEX_RESPONSES_URL,
    proxyHost: '',
    builtIn: true
  }
];
