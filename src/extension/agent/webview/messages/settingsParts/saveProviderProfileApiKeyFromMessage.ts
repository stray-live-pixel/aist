import { saveProviderProfileApiKey } from '../../../config/providerApiKeys';
import { getProviderProfiles } from '../../../config/providerProfiles';
import { type AgentWebviewMessageDeps } from '../types';

export async function saveProviderProfileApiKeyFromMessage(
  profileId: string,
  apiKey: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  const profile = getProviderProfiles().find((item) => item.id === profileId);
  if (!profile) {
    throw new Error(`Provider profile not found: ${profileId}`);
  }

  await saveProviderProfileApiKey({ profile, apiKey, secretStore: deps.secretStore });
}
