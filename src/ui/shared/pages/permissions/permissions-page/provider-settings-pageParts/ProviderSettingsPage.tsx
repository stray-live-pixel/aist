import { Copy, Trash2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { agentActions } from '../../../../shared/lib/agentActions';
import { type AgentState, type ProviderProfile } from '../../../../shared/types';
import { Badge, Button, Card, Select, Text, TextField } from '../../../../shared/ui';
import { RequestSettingsPanel } from '../../../chat/RequestSettingsPanel';
import styles from '../../PermissionsPage.module.scss';
import { CodexAuthRow } from './CodexAuthRow';
import { DraftProfile } from './DraftProfile';
import { ProviderApiKeyField } from './ProviderApiKeyField';
import { createDrafts } from './createDrafts';
import { getEndpointPlaceholder } from './getEndpointPlaceholder';
import { getProviderDescription } from './getProviderDescription';
import { pruneDraftsForProfiles } from './pruneDraftsForProfiles';

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
