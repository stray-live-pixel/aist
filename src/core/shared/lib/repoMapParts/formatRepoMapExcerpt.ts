import { RepoMap } from './RepoMap';
import { formatList } from './formatList';

export function formatRepoMapExcerpt(repoMap: Omit<RepoMap, 'excerpt'>): string {
  const lines = ['Repo map:'];
  const packageLabel = repoMap.packageManager
    ? `${repoMap.packageManager}${repoMap.packageName ? ` package "${repoMap.packageName}"` : ' package'}`
    : 'no package.json/package manager detected';

  lines.push(`- Package: ${packageLabel}`);
  lines.push(`- Scripts: ${formatList(repoMap.scripts)}`);
  lines.push(`- Config files: ${formatList(repoMap.configFiles)}`);
  lines.push(`- Top-level dirs: ${formatList(repoMap.topLevelDirs)}`);
  lines.push(`- Verification hints: ${formatList(repoMap.verificationHints)}`);

  return lines.join('\n');
}
