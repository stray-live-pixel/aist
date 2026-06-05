import { type ProviderProfile } from '../../../../types';
import { DraftProfile } from './DraftProfile';

export function createDrafts(profiles: ProviderProfile[]): Record<string, DraftProfile> {
  return Object.fromEntries(profiles.map((profile) => [profile.id, { ...profile }]));
}
