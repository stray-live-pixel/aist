import { Eye, EyeOff, KeyRound } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { type ProviderProfile } from '../../../../types';
import { Badge, Button, TextField } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';

export function ProviderApiKeyField({
  profile,
  value,
  visible,
  onChange,
  onToggleVisible,
  onSave
}: {
  profile: ProviderProfile;
  value: string;
  visible: boolean;
  onChange(apiKey: string): void;
  onToggleVisible(): void;
  onSave(): void;
}) {
  const { t } = useI18n();
  const supported = profile.apiKeySource !== 'unsupported';

  return (
    <div className={styles.formGrid}>
      <div className={styles.actions}>
        <Badge
          tone={profile.apiKeyConfigured ? 'success' : supported ? 'warning' : 'neutral'}
          icon={<KeyRound size={12} />}
        >
          {profile.apiKeyConfigured ? t('settings.providers.apiKeyConfigured') : t('settings.providers.apiKeyMissing')}
        </Badge>
        {profile.apiKeySource === 'legacy-global-secret' ? (
          <Badge tone="neutral">{t('settings.providers.apiKeyLegacy')}</Badge>
        ) : null}
      </div>
      <TextField
        label={t('settings.providers.apiKey')}
        value={value}
        type={visible ? 'text' : 'password'}
        disabled={!supported}
        placeholder={supported ? 'sk-or-...' : t('settings.providers.apiKeyUnsupported')}
        hint={supported ? t('settings.providers.apiKeyHint') : t('settings.providers.apiKeyUnsupportedHint')}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        trailingSlot={
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            type="button"
            title={visible ? t('settings.providers.apiKeyHide') : t('settings.providers.apiKeyShow')}
            aria-label={visible ? t('settings.providers.apiKeyHide') : t('settings.providers.apiKeyShow')}
            disabled={!supported}
            onClick={onToggleVisible}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        }
      />
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" disabled={!supported || !value.trim()} onClick={onSave}>
          {t('settings.providers.saveApiKey')}
        </Button>
      </div>
    </div>
  );
}
