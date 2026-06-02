import { PackageManager } from './PackageManager';

export type RepoMap = {
  workspacePath: string;
  packageManager: PackageManager | null;
  packageName: string | null;
  scripts: string[];
  configFiles: string[];
  topLevelDirs: string[];
  verificationHints: string[];
  excerpt: string;
};
