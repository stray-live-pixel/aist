import type { ProviderProfile } from '../../shared/types';

/**
 * Что это: выбирает профиль провайдера для первого dropdown-а с fallback на базовый provider.
 * Зачем нужно: active model хранит model id, а не profile id; при отсутствии явного выбора UI должен стабильно показать
 * подходящий профиль и не сбрасывать пользователя на другой корпоративный маршрут.
 */
export function getSelectedProviderProfile(
  profiles: ProviderProfile[],
  profileId: string | undefined,
  provider: ProviderProfile['provider']
): ProviderProfile | undefined {
  return (
    profiles.find((profile) => profile.id === profileId) || profiles.find((profile) => profile.provider === provider)
  );
}
