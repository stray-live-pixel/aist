import * as vscode from 'vscode';

import { normalizeProviderProfiles } from '../../../core/entities/model/normalizeProviderProfiles';
import type { ProviderProfile } from '../../../core/entities/model/providerProfile';
import type { JsonValue, ModelProvider } from '../../../core/shared/types/types';

export type ProviderProfileInput = Partial<
  Pick<ProviderProfile, 'id' | 'name' | 'provider' | 'endpoint' | 'proxyHost'>
>;

/**
 * Что это: читает профили провайдеров из VS Code settings и добавляет обязательные встроенные профили.
 * Зачем нужно: UI, extension и daemon должны видеть одинаковый список маршрутов, иначе пользователь сохранит proxy,
 * но следующий запрос может уйти напрямую на стандартный endpoint.
 */
export function getProviderProfiles(): ProviderProfile[] {
  const raw = vscode.workspace.getConfiguration('openrouterAgent').get<JsonValue>('providerProfiles');
  return normalizeProviderProfiles(raw);
}

/**
 * Что это: сохраняет изменения одного профиля провайдера в workspace settings.
 * Зачем нужно: форма редактирует только один маршрут, но в settings хранится весь список; merge защищает остальные
 * профили от потери при быстрых последовательных сохранениях.
 */
export async function upsertProviderProfile(input: ProviderProfileInput): Promise<ProviderProfile[]> {
  const provider = normalizeProvider(input.provider);
  const id = normalizeId(input.id || `${provider}-${Date.now()}`);
  const profile: ProviderProfile = {
    id,
    name: normalizeName(input.name, id),
    provider,
    endpoint: input.endpoint?.trim() || '',
    proxyHost: input.proxyHost?.trim() || '',
    builtIn: id === provider
  };
  const profiles = getProviderProfiles();
  const nextProfiles = profiles.some((item) => item.id === profile.id)
    ? profiles.map((item) => (item.id === profile.id ? { ...profile, builtIn: item.builtIn } : item))
    : [...profiles, { ...profile, builtIn: false }];

  await saveProviderProfiles(nextProfiles);
  return getProviderProfiles();
}

/**
 * Что это: создаёт пользовательскую копию существующего профиля с новым id/name.
 * Зачем нужно: дублирование позволяет быстро сделать openrouter-work/openrouter-pet без ручного копирования endpoint/proxy.
 */
export async function duplicateProviderProfile(profileId: string): Promise<ProviderProfile[]> {
  const profiles = getProviderProfiles();
  const source = profiles.find((profile) => profile.id === profileId) || profiles[0];
  const duplicateId = createUniqueProfileId(source.id, profiles);

  return upsertProviderProfile({
    ...source,
    id: duplicateId,
    name: `${source.name} copy`
  });
}

/**
 * Что это: удаляет только пользовательский профиль провайдера.
 * Зачем нужно: встроенные профили являются fallback для старой конфигурации, поэтому их удаление нарушило бы модель маршрутизации.
 */
export async function deleteProviderProfile(profileId: string): Promise<ProviderProfile[]> {
  const nextProfiles = getProviderProfiles().filter((profile) => profile.builtIn || profile.id !== profileId);
  await saveProviderProfiles(nextProfiles);
  return getProviderProfiles();
}

async function saveProviderProfiles(profiles: ProviderProfile[]): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('providerProfiles', profiles, vscode.ConfigurationTarget.Workspace);
}

function createUniqueProfileId(baseId: string, profiles: ProviderProfile[]): string {
  const ids = new Set(profiles.map((profile) => profile.id));
  let index = 2;
  let candidate = `${baseId}-copy`;

  while (ids.has(candidate)) {
    candidate = `${baseId}-copy-${index}`;
    index += 1;
  }

  return candidate;
}

function normalizeId(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `provider-${Date.now()}`
  );
}

function normalizeName(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function normalizeProvider(value: unknown): ModelProvider {
  return value === 'codex' ? 'codex' : 'openrouter';
}
