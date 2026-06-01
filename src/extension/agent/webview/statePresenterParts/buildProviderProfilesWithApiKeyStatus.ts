import { getProviderProfileApiKeyStatus } from '../../config/providerApiKeys';
import { getProviderProfiles } from '../../config/providerProfiles';
import { SendAgentStateParams } from './SendAgentStateParams';

export async function buildProviderProfilesWithApiKeyStatus(params: Pick<SendAgentStateParams, 'secretStore'>): Promise<
  Array<
    ReturnType<typeof getProviderProfiles>[number] & {
      apiKeyConfigured: boolean;
      apiKeySource: 'profile-secret' | 'legacy-global-secret' | 'unsupported' | 'none';
    }
  >
> {
  const profiles = getProviderProfiles();

  return Promise.all(
    profiles.map(async (profile) => {
      const status = await getProviderProfileApiKeyStatus({ profile, secretStore: params.secretStore });
      return { ...profile, apiKeyConfigured: status.configured, apiKeySource: status.source };
    })
  );
}
