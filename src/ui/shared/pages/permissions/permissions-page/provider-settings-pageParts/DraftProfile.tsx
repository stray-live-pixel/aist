import { type ProviderProfile } from '../../../../types';

export type DraftProfile = Pick<ProviderProfile, 'id' | 'name' | 'provider' | 'endpoint' | 'proxyHost' | 'builtIn'>;
