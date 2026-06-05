import type { ProviderProfile } from '../../types';
import type { SelectOption } from '../../ui';

/**
 * Что это: строит компактные option-ы первого уровня выбора — профили провайдеров.
 * Зачем нужно: при нескольких OpenRouter-профилях UI показывает маршруты без загрузки моделей каждого профиля,
 * поэтому пользователь сначала явно выбирает нужный endpoint/proxy контур.
 */
export function getProviderOptions(profiles: ProviderProfile[]): SelectOption[] {
  return profiles.map((profile) => ({
    value: profile.id,
    label: profile.name
  }));
}
