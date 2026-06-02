import { RepoMap } from './RepoMap';
import { detectPackageManager } from './detectPackageManager';
import { formatRepoMapExcerpt } from './formatRepoMapExcerpt';
import { getExistingConfigFiles } from './getExistingConfigFiles';
import { getPackageScripts } from './getPackageScripts';
import { getTopLevelDirs } from './getTopLevelDirs';
import { getVerificationHints } from './getVerificationHints';
import { readPackageJson } from './readPackageJson';

export function buildRepoMap(workspacePath: string): RepoMap {
  const packageJson = readPackageJson(workspacePath);
  const configFiles = getExistingConfigFiles(workspacePath);
  const packageManager = detectPackageManager(workspacePath, packageJson);
  const scripts = getPackageScripts(packageJson);
  const verificationHints = getVerificationHints(packageManager, scripts);
  const topLevelDirs = getTopLevelDirs(workspacePath);
  const packageName = typeof packageJson?.name === 'string' ? packageJson.name : null;

  const repoMap = {
    workspacePath,
    packageManager,
    packageName,
    scripts,
    configFiles,
    topLevelDirs,
    verificationHints,
    excerpt: ''
  };

  return {
    ...repoMap,
    excerpt: formatRepoMapExcerpt(repoMap)
  };
}
