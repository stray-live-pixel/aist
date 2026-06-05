import { useI18n } from '../../../../shared/i18n';
import { type ProviderProfile } from '../../../../shared/types';

export function getProviderDescription(
  provider: ProviderProfile['provider'],
  t: ReturnType<typeof useI18n>['t']
): string {
  return provider === 'codex'
    ? t('settings.providers.codexDescription')
    : t('settings.providers.openrouterDescription');
}
