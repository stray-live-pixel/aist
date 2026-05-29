import type { JsonValue, ModelProvider } from '../../shared/types/types';
import { DEFAULT_PROVIDER_PROFILES } from './defaultProviderProfiles';
import type { ProviderProfile } from './providerProfile';

const PROVIDERS = new Set<ModelProvider>(['openrouter', 'codex']);

/**
 * Что это: превращает пользовательский JSON из настроек в консистентный список профилей провайдеров.
 * Зачем нужно: UI и daemon читают один и тот же config, поэтому нормализация в core не допускает пустые id,
 * дубли и потерю встроенных профилей, иначе запросы могли бы уйти не через тот корпоративный маршрут.
 */
export function normalizeProviderProfiles(value: JsonValue | undefined): ProviderProfile[] {
  const profilesById = new Map<string, ProviderProfile>();

  for (const profile of DEFAULT_PROVIDER_PROFILES) {
    profilesById.set(profile.id, profile);
  }

  if (!Array.isArray(value)) {
    return [...profilesById.values()];
  }

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const id = readString(item.id);
    const provider = readProvider(item.provider);
    if (!id || !provider || profilesById.has(id)) {
      continue;
    }

    profilesById.set(id, {
      id,
      name: readString(item.name) || id,
      provider,
      endpoint: readString(item.endpoint),
      proxyHost: readString(item.proxyHost),
      builtIn: false
    });
  }

  return [...profilesById.values()];
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readProvider(value: unknown): ModelProvider | undefined {
  return typeof value === 'string' && PROVIDERS.has(value as ModelProvider) ? (value as ModelProvider) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
