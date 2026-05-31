import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, LogIn, LogOut, Trash2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentState, ProviderProfile } from '../../../shared/types';
import { Badge, Button, Card, Select, Text, TextField } from '../../../shared/ui';
import { RequestSettingsPanel } from '../../chat/RequestSettingsPanel';
import styles from '../PermissionsPage.module.scss';

type DraftProfile = Pick<ProviderProfile, 'id' | 'name' | 'provider' | 'endpoint' | 'proxyHost' | 'builtIn'>;

/**
 * Что это: отдельная страница сетевых профилей провайдеров.
 * Зачем нужно: endpoint/proxy являются настройками маршрута, а не модели; переносим их в отдельную форму,
 * чтобы корпоративные пользователи явно видели, куда уходят запросы OpenRouter/Codex и могли дублировать маршрут.
 */
export const ProviderSettingsPage = memo(function ProviderSettingsPage({
  state,
  profiles,
  codexAuthenticated
}: {
  state: AgentState;
  profiles: ProviderProfile[];
  codexAuthenticated: boolean;
}) {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Record<string, DraftProfile>>(() => createDrafts(profiles));
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, string>>({});
  const [visibleApiKeys, setVisibleApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDrafts(createDrafts(profiles));
    setApiKeyDrafts((current) => pruneDraftsForProfiles(current, profiles));
    setVisibleApiKeys((current) => pruneDraftsForProfiles(current, profiles));
  }, [profiles]);

  return (
    <div className={styles.sectionStack}>
      <RequestSettingsPanel state={state} scope="default" />
      <Card title={t('settings.providers.title')} description={t('settings.providers.description')}>
        <Text variant="body">{t('settings.providers.productHint')}</Text>
      </Card>
      {profiles.map((profile) => {
        const draft = drafts[profile.id] || profile;
        return (
          <Card
            key={profile.id}
            title={draft.name || profile.name}
            description={getProviderDescription(profile.provider, t)}
            actions={
              <div className={styles.actions}>
                <Badge tone={profile.builtIn ? 'accent' : 'neutral'}>
                  {profile.builtIn ? t('settings.providers.builtIn') : t('common.custom')}
                </Badge>
                <Badge tone="neutral">{profile.provider}</Badge>
              </div>
            }
          >
            <div className={styles.formGrid}>
              <div className={styles.twoColumns}>
                <TextField
                  label={t('settings.providers.profileName')}
                  value={draft.name}
                  onChange={(event) => updateDraft(profile.id, { name: event.target.value })}
                />
                <TextField
                  label={t('settings.providers.profileId')}
                  value={draft.id}
                  disabled={profile.builtIn}
                  onChange={(event) => updateDraft(profile.id, { id: event.target.value })}
                />
              </div>
              <Select
                label={t('settings.providers.provider')}
                value={draft.provider}
                disabled={profile.builtIn}
                options={[
                  { value: 'openrouter', label: 'OpenRouter' },
                  { value: 'codex', label: 'ChatGPT Codex' }
                ]}
                onChange={(event) =>
                  updateDraft(profile.id, { provider: event.target.value as ProviderProfile['provider'] })
                }
              />
              <TextField
                label={t('settings.providers.endpoint')}
                value={draft.endpoint}
                placeholder={getEndpointPlaceholder(profile.provider)}
                hint={t('settings.providers.endpointHint')}
                onChange={(event) => updateDraft(profile.id, { endpoint: event.target.value })}
              />
              <TextField
                label={t('settings.providers.proxyHost')}
                value={draft.proxyHost}
                placeholder="https://corp-proxy.example/llm"
                hint={t('settings.providers.proxyHostHint')}
                onChange={(event) => updateDraft(profile.id, { proxyHost: event.target.value })}
              />
              <ProviderApiKeyField
                profile={profile}
                value={apiKeyDrafts[profile.id] || ''}
                visible={Boolean(visibleApiKeys[profile.id])}
                onChange={(apiKey) => updateApiKeyDraft(profile.id, apiKey)}
                onToggleVisible={() => toggleApiKeyVisible(profile.id)}
                onSave={() => saveApiKey(profile)}
              />
              {profile.provider === 'codex' ? <CodexAuthRow authenticated={codexAuthenticated} /> : null}
              <div className={styles.actions}>
                <Button variant="primary" size="sm" onClick={() => agentActions.upsertProviderProfile(draft)}>
                  {t('common.save')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Copy size={14} />}
                  onClick={() => agentActions.duplicateProviderProfile(profile.id)}
                >
                  {t('settings.providers.duplicate')}
                </Button>
                {!profile.builtIn ? (
                  <Button
                    variant="danger"
                    size="sm"
                    leadingIcon={<Trash2 size={14} />}
                    onClick={() => agentActions.deleteProviderProfile(profile.id)}
                  >
                    {t('common.delete')}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  function updateDraft(profileId: string, patch: Partial<DraftProfile>): void {
    setDrafts((current) => ({
      ...current,
      [profileId]: { ...(current[profileId] || profiles.find((profile) => profile.id === profileId)!), ...patch }
    }));
  }

  function updateApiKeyDraft(profileId: string, apiKey: string): void {
    setApiKeyDrafts((current) => ({ ...current, [profileId]: apiKey }));
  }

  function toggleApiKeyVisible(profileId: string): void {
    setVisibleApiKeys((current) => ({ ...current, [profileId]: !current[profileId] }));
  }

  function saveApiKey(profile: ProviderProfile): void {
    const apiKey = apiKeyDrafts[profile.id]?.trim();
    if (!apiKey) {
      return;
    }

    agentActions.setProviderProfileApiKey(profile.id, apiKey);
    setApiKeyDrafts((current) => ({ ...current, [profile.id]: '' }));
  }
});

function ProviderApiKeyField({
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

function CodexAuthRow({ authenticated }: { authenticated: boolean }) {
  const { t } = useI18n();

  return authenticated ? (
    <div className={styles.actions}>
      <Badge tone="success" icon={<CheckCircle2 size={12} />}>
        {t('common.authorized')}
      </Badge>
      <Button variant="secondary" size="sm" leadingIcon={<LogOut size={14} />} onClick={agentActions.codexLogout}>
        {t('settings.system.logout')}
      </Button>
    </div>
  ) : (
    <Button variant="primary" size="sm" leadingIcon={<LogIn size={14} />} onClick={agentActions.codexLogin}>
      {t('common.authorize')}
    </Button>
  );
}

function createDrafts(profiles: ProviderProfile[]): Record<string, DraftProfile> {
  return Object.fromEntries(profiles.map((profile) => [profile.id, { ...profile }]));
}

function pruneDraftsForProfiles<T>(drafts: Record<string, T>, profiles: ProviderProfile[]): Record<string, T> {
  const profileIds = new Set(profiles.map((profile) => profile.id));
  return Object.fromEntries(Object.entries(drafts).filter(([profileId]) => profileIds.has(profileId)));
}

function getProviderDescription(provider: ProviderProfile['provider'], t: ReturnType<typeof useI18n>['t']): string {
  return provider === 'codex'
    ? t('settings.providers.codexDescription')
    : t('settings.providers.openrouterDescription');
}

function getEndpointPlaceholder(provider: ProviderProfile['provider']): string {
  return provider === 'codex'
    ? 'https://chatgpt.com/backend-api/codex/responses'
    : 'https://openrouter.ai/api/v1/chat/completions';
}
