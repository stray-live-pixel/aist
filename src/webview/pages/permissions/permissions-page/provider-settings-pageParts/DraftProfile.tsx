import { type ProviderProfile } from '../../../../shared/types';

export type DraftProfile = Pick<ProviderProfile, 'id' | 'name' | 'provider' | 'endpoint' | 'proxyHost' | 'builtIn'>;
