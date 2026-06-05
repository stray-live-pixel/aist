import { type ProviderProfile } from '../../../../types';

export function pruneDraftsForProfiles<T>(drafts: Record<string, T>, profiles: ProviderProfile[]): Record<string, T> {
  const profileIds = new Set(profiles.map((profile) => profile.id));
  return Object.fromEntries(Object.entries(drafts).filter(([profileId]) => profileIds.has(profileId)));
}
