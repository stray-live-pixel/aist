import { describe, expect, it } from 'vitest';

import { OPENROUTER_API_KEY_SECRET_KEY, type SecretStore } from '../../../core/app/config/config';
import { getProviderProfileApiKeyStatus, saveProviderProfileApiKey } from './providerApiKeys';

/**
 * Что это: in-memory secret store для unit-тестов profile-level авторизации.
 * Зачем нужно: тест проверяет продуктовую логику разделения ключей без записи реальных секретов на диск.
 */
class MemorySecretStore implements SecretStore {
  readonly values = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe('providerApiKeys', () => {
  it('stores OpenRouter API keys per provider profile', async () => {
    const secretStore = new MemorySecretStore();

    await saveProviderProfileApiKey({
      profile: { id: 'openrouter-work', provider: 'openrouter' },
      apiKey: 'sk-work',
      secretStore
    });
    await saveProviderProfileApiKey({
      profile: { id: 'openrouter-personal', provider: 'openrouter' },
      apiKey: 'sk-personal',
      secretStore
    });

    expect(secretStore.values.get('providerProfiles.openrouter-work.apiKey')).toBe('sk-work');
    expect(secretStore.values.get('providerProfiles.openrouter-personal.apiKey')).toBe('sk-personal');
    await expect(
      getProviderProfileApiKeyStatus({
        profile: { id: 'openrouter-work', provider: 'openrouter' },
        secretStore
      })
    ).resolves.toEqual({ profileId: 'openrouter-work', configured: true, source: 'profile-secret' });
  });

  it('keeps legacy OpenRouter key only for the built-in profile fallback', async () => {
    const secretStore = new MemorySecretStore();
    await secretStore.store(OPENROUTER_API_KEY_SECRET_KEY, 'sk-legacy');

    await expect(
      getProviderProfileApiKeyStatus({ profile: { id: 'openrouter', provider: 'openrouter' }, secretStore })
    ).resolves.toEqual({ profileId: 'openrouter', configured: true, source: 'legacy-global-secret' });
    await expect(
      getProviderProfileApiKeyStatus({
        profile: { id: 'openrouter-work', provider: 'openrouter' },
        secretStore
      })
    ).resolves.toEqual({ profileId: 'openrouter-work', configured: false, source: 'none' });
  });

  it('marks Codex profile API key auth as unsupported', async () => {
    const secretStore = new MemorySecretStore();

    await expect(
      getProviderProfileApiKeyStatus({ profile: { id: 'codex', provider: 'codex' }, secretStore })
    ).resolves.toEqual({ profileId: 'codex', configured: false, source: 'unsupported' });
  });
});
