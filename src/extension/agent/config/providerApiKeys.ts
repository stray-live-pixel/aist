import { OPENROUTER_API_KEY_SECRET_KEY, type SecretStore } from '../../../core/app/config/config';
import type { ProviderProfile } from '../../../core/entities/model/providerProfile';

/**
 * Что это: публичный статус API key конкретного профиля AI-провайдера.
 * Зачем нужно: webview должен показывать, подключён ли профиль, но не должен получать сам секрет.
 */
export type ProviderProfileApiKeyStatus = {
  /** Id профиля, для которого проверяется ключ. */
  profileId: string;
  /** true означает, что AIST нашёл сохранённый ключ и может выполнять запросы через этот профиль. */
  configured: boolean;
  /** Источник ключа нужен пользователю, чтобы понимать, где менять авторизацию. */
  source: 'profile-secret' | 'legacy-global-secret' | 'unsupported' | 'none';
};

/**
 * Что это: сохраняет API key отдельного provider profile в глобальное secret-хранилище AIST.
 * Зачем нужно: пользователь может создать несколько OpenRouter-профилей с разными аккаунтами/лимитами,
 * поэтому каждый профиль получает собственный секрет вне workspace settings.
 */
export async function saveProviderProfileApiKey({
  profile,
  apiKey,
  secretStore
}: {
  profile: Pick<ProviderProfile, 'id' | 'provider'>;
  apiKey: string;
  secretStore: SecretStore;
}): Promise<void> {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey) {
    throw new Error('API key is empty.');
  }

  const secretKey = getProviderProfileApiKeySecretKey({ profile });
  if (!secretKey) {
    throw new Error(`API key auth is not supported for provider: ${profile.provider}`);
  }

  await secretStore.store(secretKey, normalizedApiKey);
}

/**
 * Что это: читает безопасный статус API key профиля без раскрытия значения секрета.
 * Зачем нужно: UI показывает badge авторизации по каждому профилю, но никогда не получает ключ обратно.
 */
export async function getProviderProfileApiKeyStatus({
  profile,
  secretStore
}: {
  profile: Pick<ProviderProfile, 'id' | 'provider'>;
  secretStore: SecretStore;
}): Promise<ProviderProfileApiKeyStatus> {
  const secretKey = getProviderProfileApiKeySecretKey({ profile });
  if (!secretKey) {
    return { profileId: profile.id, configured: false, source: 'unsupported' };
  }

  const profileApiKey = await secretStore.get(secretKey);
  if (profileApiKey) {
    return { profileId: profile.id, configured: true, source: 'profile-secret' };
  }

  // Встроенный OpenRouter профиль сохраняет совместимость с ключом, который уже был задан через CLI/env migration.
  const legacyApiKey = profile.id === 'openrouter' ? await secretStore.get(OPENROUTER_API_KEY_SECRET_KEY) : undefined;
  return {
    profileId: profile.id,
    configured: Boolean(legacyApiKey),
    source: legacyApiKey ? 'legacy-global-secret' : 'none'
  };
}

/**
 * Что это: строит ключ секрета для конкретного provider profile.
 * Зачем нужно: это единый источник правды, чтобы UI, extension и будущий daemon одинаково разделяли ключи профилей.
 */
function getProviderProfileApiKeySecretKey({
  profile
}: {
  profile: Pick<ProviderProfile, 'id' | 'provider'>;
}): string | undefined {
  if (profile.provider !== 'openrouter') {
    return undefined;
  }

  return `providerProfiles.${profile.id}.apiKey`;
}
