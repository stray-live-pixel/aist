import path from 'node:path';

import { RepoMap } from './RepoMap';
import { buildRepoMap } from './buildRepoMap';
import { computeRepoMapFingerprint } from './computeRepoMapFingerprint';
import { repoMapCache } from './repoMapCache';

export function getRepoMap(workspacePath: string): RepoMap {
  const normalizedWorkspacePath = path.resolve(workspacePath);
  const fingerprint = computeRepoMapFingerprint(normalizedWorkspacePath);
  const cached = repoMapCache.get(normalizedWorkspacePath);

  if (cached?.fingerprint === fingerprint) {
    return cached.repoMap;
  }

  const repoMap = buildRepoMap(normalizedWorkspacePath);
  repoMapCache.set(normalizedWorkspacePath, { fingerprint, repoMap });
  return repoMap;
}
